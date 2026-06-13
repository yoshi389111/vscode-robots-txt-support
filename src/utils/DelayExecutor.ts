/**
 * DelayExecutor is a utility class that allows you to execute a callback function after a specified delay.
 * It also provides the ability to execute a callback immediately and to cancel any pending delayed execution.
 */
export class DelayExecutor {
  /** The timeout ID for the currently scheduled callback, if any. */
  private timeout: NodeJS.Timeout | null = null;

  /**
   * Executes the given callback function after the specified delay.
   * If there is already a pending callback, it will be canceled before scheduling the new one.
   * @param callback The function to execute after the delay
   * @param delay The delay in milliseconds before executing the callback
   */
  public execute(callback: () => void, delay: number) {
    this.cancel();
    this.timeout = setTimeout(() => {
      this.timeout = null;
      callback();
    }, delay);
  }

  /**
   * Executes the given callback function immediately, canceling any pending delayed execution.
   * @param callback The function to execute immediately
   */
  public executeImmediate(callback: () => void) {
    this.cancel();
    callback();
  }

  /**
   * Cancels any pending delayed execution.
   */
  public cancel() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }

  public dispose() {
    this.cancel();
  }
}
