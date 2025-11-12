import { Buffer } from 'buffer';

export interface RunnerInterface {
    /**
     * Initializes the runner
     */
    initialize(): Promise<void>;

    /**
     * Loads given URL with or without JS enabled
     * @param url
     * @param jsEnabled
     */
    loadPage(url: string, jsEnabled: boolean): Promise<void>;

    /**
     * Screenshot element identified by selector.
     * Throws an error if no element is found
     * @param selector
     */
    screenshotElement(selector: string): Promise<Buffer>;

    /**
     * Returns browser process id if available
     */
    getBrowserPid?(): number | undefined;

    /**
     * Close and destroy runner
     */
    destroy?(): Promise<void> | void;
}
