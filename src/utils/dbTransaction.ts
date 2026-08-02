class SimpleMutex {
  private queue: Promise<void> = Promise.resolve();

  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    let resolveNext: () => void;
    const nextPromise = new Promise<void>((resolve) => {
      resolveNext = resolve;
    });

    const currentPromise = this.queue;
    this.queue = nextPromise;

    try {
      await currentPromise;
      return await fn();
    } finally {
      resolveNext!();
    }
  }
}

const dbMutex = new SimpleMutex();

export async function safeTransaction<T>(operation: () => Promise<T>): Promise<T> {
  return dbMutex.runExclusive(operation);
}
