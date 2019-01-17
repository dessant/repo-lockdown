const uniqBy = require('lodash.uniqby');

module.exports = class Lockdown {
  constructor(context, config, logger) {
    this.context = context;
    this.config = config;
    this.log = logger;
  }

  async processBacklog() {
    const {only: type} = this.config;
    if (type) {
      await this.backlog(type);
    } else {
      await this.backlog('issues');
      await this.backlog('pulls');
    }
  }

  async processNewThread() {
    const {github, payload} = this.context;
    const issue = this.context.issue();

    const {only} = this.config;
    const type = payload.issue ? 'issues' : 'pulls';
    if (only && only !== type) {
      return;
    }

    const skipCreatedBefore = this.getConfigValue(type, 'skipCreatedBefore');
    const comment = this.getConfigValue(type, 'comment');
    const label = this.getConfigValue(type, 'label');
    const close = this.getConfigValue(type, 'close');
    const lock = this.getConfigValue(type, 'lock');

    if (!close && !lock) {
      return;
    }

    if (skipCreatedBefore) {
      const created = new Date(
        (payload.issue || payload.pull_request).created_at.split('T')[0]
      );
      const skipBefore = new Date(skipCreatedBefore);
      if (created.getTime() < skipBefore.getTime()) {
        return;
      }
    }

    if (comment) {
      this.log.info(issue, 'Commenting');
      await github.issues.createComment({
        ...issue,
        body: comment
      });
    }

    if (label) {
      this.log.info(issue, 'Labeling');
      await github.issues.addLabels({
        ...issue,
        labels: [label]
      });
    }

    if (close) {
      this.log.info(issue, 'Closing');
      await github.issues.edit({...issue, state: 'closed'});
    }

    if (lock) {
      this.log.info(issue, 'Locking');
      await github.issues.lock(issue);
    }
  }

  async backlog(type) {
    const {github} = this.context;
    const repo = this.context.repo();
    const comment = this.getConfigValue(type, 'comment');
    const label = this.getConfigValue(type, 'label');
    const close = this.getConfigValue(type, 'close');
    const lock = this.getConfigValue(type, 'lock');

    if (!close && !lock) {
      return;
    }

    const results = await this.search(type);

    for (const result of results) {
      const issue = {...repo, number: result.number};

      if (comment) {
        this.log.info(issue, 'Commenting');
        await this.ensureUnlock(
          issue,
          {active: result.locked, reason: result.active_lock_reason},
          () => github.issues.createComment({...issue, body: comment})
        );
      }

      if (label) {
        this.log.info(issue, 'Labeling');
        await github.issues.addLabels({
          ...issue,
          labels: [label]
        });
      }

      if (close && result.state === 'open') {
        this.log.info(issue, 'Closing');
        await github.issues.edit({...issue, state: 'closed'});
      }

      if (lock && !result.locked) {
        this.log.info(issue, 'Locking');
        await github.issues.lock(issue);
      }
    }
  }

  async search(type) {
    const {owner, repo} = this.context.repo();
    const skipCreatedBefore = this.getConfigValue(type, 'skipCreatedBefore');
    const lock = this.getConfigValue(type, 'lock');

    let query = `repo:${owner}/${repo}`;
    if (type === 'issues') {
      query += ' is:issue';
    } else {
      query += ' is:pr';
    }

    if (skipCreatedBefore) {
      query += ` created:>${skipCreatedBefore}`;
    }

    this.log.info({repo: {owner, repo}}, `Searching ${type}`);
    const results = (await this.context.github.search.issues({
      q: query + ' is:open',
      sort: 'updated',
      order: 'desc',
      per_page: 30,
      headers: {
        Accept: 'application/vnd.github.sailor-v-preview+json'
      }
    })).data.items;

    if (lock) {
      results.push(
        ...(await this.context.github.search.issues({
          q: query + ' is:unlocked',
          sort: 'updated',
          order: 'desc',
          per_page: 30,
          headers: {
            Accept: 'application/vnd.github.sailor-v-preview+json'
          }
        })).data.items
      );
    }

    return uniqBy(results, 'number');
  }

  async ensureUnlock(issue, lock, action) {
    const github = this.context.github;
    if (lock.active) {
      if (!lock.hasOwnProperty('reason')) {
        const {data: issueData} = await github.issues.get({
          ...issue,
          headers: {
            Accept: 'application/vnd.github.sailor-v-preview+json'
          }
        });
        lock.reason = issueData.active_lock_reason;
      }
      await github.issues.unlock(issue);
      await action();
      if (lock.reason) {
        issue = {
          ...issue,
          lock_reason: lock.reason,
          headers: {
            Accept: 'application/vnd.github.sailor-v-preview+json'
          }
        };
      }
      await github.issues.lock(issue);
    } else {
      await action();
    }
  }

  getConfigValue(type, key) {
    if (this.config[type] && typeof this.config[type][key] !== 'undefined') {
      return this.config[type][key];
    }
    return this.config[key];
  }
};
