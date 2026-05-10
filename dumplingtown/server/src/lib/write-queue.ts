/**
 * Serial async write queue for SQLite.
 * All writes go through the queue to prevent SQLITE_BUSY errors.
 * Reads bypass the queue since WAL allows concurrent reads.
 */
export class WriteQueue {
  private queue: Array<() => Promise<unknown>> = [];
  private processing = false;

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const fn = this.queue.shift()!;
      await fn();
    }

    this.processing = false;
  }

  get pending() {
    return this.queue.length;
  }
}
