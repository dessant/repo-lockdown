import {debug, info, setFailed, setOutput, warning} from '@actions/core';
import {context} from '@actions/github';
import uniqBy from 'lodash.uniqby';

import {getConfig, getClient} from './utils.js';

async function run() {
  try {
    const config = getConfig();
    const client = getClient(config['github-token']);

    const app = new App(config, client);
    if (['schedule', 'workflow_dispatch'].includes(context.eventName)) {
      await app.processBacklog();
    } else {
      await app.processNewThread();
    }
  } catch (err) {
    setFailed(err);
  }
}

class App {
  constructor(config, client) {
    this.config = config;
    this.client = client;
  }

  async processBacklog() {
    const processOnly = this.config['process-only'];
    const logOutput = this.config['log-output'];
    const threadTypes = processOnly ? [processOnly] : ['issue', 'pr'];

    let threadsFound = false;
    for (const threadType of threadTypes) {
      const threads = await this.lockdown({threadType});

      debug(`Setting output (${threadType}s)`);
      if (threads.length) {
        threadsFound = true;
        setOutput(`${threadType}s`, JSON.stringify(threads));

        if (logOutput) {
          info(`Output (${threadType}s)`);
          info(JSON.stringify(threads, null, 2));
        }
      } else {
        setOutput(`${threadType}s`, '');
      }
    }

    if (!threadsFound) {
      warning(
        'All issues and pull requests have been processed. Remove the `schedule` event from the workflow file to avoid unnecessary workflow runs in the future.'
      );
    }
  }

  async processNewThread() {
    const logOutput = this.config['log-output'];
    const threadType = context.eventName === 'issues' ? 'issue' : 'pr';

    const processOnly = this.config['process-only'];
    if (processOnly && processOnly !== threadType) {
      return;
    }

    const threads = await this.lockdown({
      threadType,
      threadData: context.payload.issue || context.payload.pull_request
    });

    debug(`Setting output (${threadType}s)`);
    if (threads.length) {
      setOutput(`${threadType}s`, JSON.stringify(threads));

      if (logOutput) {
        info(`Output (${threadType}s)`);
        info(JSON.stringify(threads, null, 2));
      }
    } else {
      setOutput(`${threadType}s`, '');
    }
  }

  async lockdown({threadType = '', threadData = null} = {}) {
    const repo = context.repo;

    const labels = this.config[`${threadType}-labels`];
    const comment = this.config[`${threadType}-comment`];
    const skipClosedComment = this.config[`skip-closed-${threadType}-comment`];
    const close = this.config[`close-${threadType}`];
    const lock = this.config[`lock-${threadType}`];
    const lockReason = this.config[`${threadType}-lock-reason`];
    const closeReason = this.config['issue-close-reason'];

    const processedThreads = [];

    if (threadData) {
      const excludeCreatedBefore =
        this.config[`exclude-${threadType}-created-before`];
      if (excludeCreatedBefore) {
        const created = new Date(threadData.created_at);
        if (created.getTime() < excludeCreatedBefore.getTime()) {
          return processedThreads;
        }
      }

      const excludeLabels = this.config[`exclude-${threadType}-labels`];
      if (excludeLabels) {
        const labels = threadData.labels.map(label => label.name);
        for (const label of excludeLabels) {
          if (labels.includes(label)) {
            return processedThreads;
          }
        }
      }
    }

    const threads = threadData
      ? [threadData]
      : await this.searchBacklog(threadType);

    for (const thread of threads) {
      const issue = {...repo, issue_number: thread.number};

      if (comment && (thread.state === 'open' || !skipClosedComment)) {
        debug(`Commenting (${threadType}: ${thread.number})`);

        await this.ensureUnlock(
          issue,
          {active: thread.locked, reason: thread.active_lock_reason},
          async () => {
            try {
              await this.client.rest.issues.createComment({
                ...issue,
                body: comment
              });
            } catch (err) {
              if (!/cannot be modified.*discussion/i.test(err.message)) {
                throw err;
              }
            }
          }
        );
      }

      if (labels) {
        debug(`Labeling (${threadType}: ${thread.number})`);

        await this.client.rest.issues.addLabels({
          ...issue,
          labels
        });
      }

      if (close && thread.state === 'open') {
        debug(`Closing (${threadType}: ${thread.number})`);

        await this.client.rest.issues.update({
          ...issue,
          state: 'closed',
          state_reason: closeReason
        });
      }

      if (lock && !thread.locked) {
        debug(`Locking (${threadType}: ${thread.number})`);

        const params = {...issue};
        if (lockReason) {
          params.lock_reason = lockReason;
        }

        await this.client.rest.issues.lock(params);
      }

      processedThreads.push(issue);
    }

    return processedThreads;
  }

  async searchBacklog(threadType) {
    const {owner, repo} = context.repo;
    let query = `repo:${owner}/${repo} is:${threadType}`;

    const excludeCreatedBefore =
      this.config[`exclude-${threadType}-created-before`];
    if (excludeCreatedBefore) {
      query += ` created:>${this.getISOTimestamp(excludeCreatedBefore)}`;
    }

    const excludeLabels = this.config[`exclude-${threadType}-labels`];
    if (excludeLabels) {
      const queryPart = excludeLabels
        .map(label => `-label:"${label}"`)
        .join(' ');
      query += ` ${queryPart}`;
    }

    debug(`Searching (${threadType}s)`);

    const results = [];

    const close = this.config[`close-${threadType}`];
    if (close) {
      const openIssues = (
        await this.client.rest.search.issuesAndPullRequests({
          q: query + ' is:open',
          sort: 'updated',
          order: 'desc',
          per_page: 50
        })
      ).data.items;

      // results may include closed issues
      results.push(...openIssues.filter(issue => issue.state === 'open'));
    }

    const lock = this.config[`lock-${threadType}`];
    if (lock) {
      const unlockedIssues = (
        await this.client.rest.search.issuesAndPullRequests({
          q: query + ' is:unlocked',
          sort: 'updated',
          order: 'desc',
          per_page: 50
        })
      ).data.items;

      // results may include locked issues
      results.push(...unlockedIssues.filter(issue => !issue.locked));
    }

    return uniqBy(results, 'number').slice(0, 50);
  }

  async ensureUnlock(issue, lock, action) {
    if (lock.active) {
      if (!lock.hasOwnProperty('reason')) {
        const {data: issueData} = await this.client.rest.issues.get(issue);
        lock.reason = issueData.active_lock_reason;
      }

      await this.client.rest.issues.unlock(issue);

      let actionError;
      try {
        await action();
      } catch (err) {
        actionError = err;
      }

      if (lock.reason) {
        issue = {...issue, lock_reason: lock.reason};
      }
      await this.client.rest.issues.lock(issue);

      if (actionError) {
        throw actionError;
      }
    } else {
      await action();
    }
  }

  getISOTimestamp(date) {
    return date.toISOString().split('.')[0] + 'Z';
  }
}

run();
