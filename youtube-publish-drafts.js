(() => {
    // -----------------------------------------------------------------
    // CONFIG (you're safe to edit this)
    // -----------------------------------------------------------------
    // ~ GLOBAL CONFIG
    // -----------------------------------------------------------------
    const MODE = 'publish_drafts'; // 'publish_drafts' / 'sort_playlist';
    const DEBUG_MODE = true; // true / false, enable for more context
    // -----------------------------------------------------------------
    // ~ PUBLISH CONFIG
    // -----------------------------------------------------------------
    const MADE_FOR_KIDS = false; // true / false;
    const VISIBILITY = 'Unlisted'; // 'Public' / 'Private' / 'Unlisted'
    // -----------------------------------------------------------------
    // END OF CONFIG (not safe to edit stuff below)
    // -----------------------------------------------------------------

    // Art by Joan G. Stark
    // .'"'.        ___,,,___        .'``.
    // : (\  `."'"```         ```"'"-'  /) ;
    //  :  \                         `./  .'
    //   `.                            :.'
    //     /        _         _        \
    //    |         0}       {0         |
    //    |         /         \         |
    //    |        /           \        |
    //    |       /             \       |
    //     \     |      .-.      |     /
    //      `.   | . . /   \ . . |   .'
    //        `-._\.'.(     ).'./_.-'
    //            `\'  `._.'  '/'
    //              `. --'-- .'
    //                `-...-'



    // ----------------------------------
    // COMMON  STUFF
    // ---------------------------------
    const TIMEOUT_STEP_MS = 20;
    const DEFAULT_ELEMENT_TIMEOUT_MS = 10000;

    const STYLES = {
        title: 'font-weight: bold; font-size: 1.1em; color: #4FC3F7; margin-top: 0.5em;',
        step: 'color: #90CAF9;',
        success: 'color: #66BB6A; font-weight: bold;',
        warn: 'color: #FFCA28;',
        error: 'color: #EF5350; font-weight: bold;',
        info: 'color: #BDBDBD;'
    };

    const Logger = {
        log: (msg, style = '') => console.log(`%c${msg}`, style),
        title: (msg) => console.log(`%c🚀 ${msg}`, STYLES.title),
        step: (msg) => console.log(`%c  ➤ ${msg}`, STYLES.step),
        success: (msg) => console.log(`%c  ✅ ${msg}`, STYLES.success),
        warn: (msg) => console.warn(`%c  ⚠️ ${msg}`, STYLES.warn),
        error: (msg) => console.error(`%c  ❌ ${msg}`, STYLES.error),
        info: (msg) => console.log(`%c     ${msg}`, STYLES.info),
        debug: (...args) => {
            if (DEBUG_MODE) console.debug('%c[DEBUG]', 'color: #757575;', ...args);
        }
    };

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    async function waitForElement(selector, baseEl = document, timeoutMs = DEFAULT_ELEMENT_TIMEOUT_MS) {
        let timeout = timeoutMs;
        while (timeout > 0) {
            let element = baseEl.querySelector(selector);
            if (element !== null) return element;
            await sleep(TIMEOUT_STEP_MS);
            timeout -= TIMEOUT_STEP_MS;
        }
        return null;
    }

    function click(element) {
        if (!element) return;
        element.scrollIntoView({ block: 'center' });
        if (typeof element.click === 'function') {
            element.click();
        } else {
            const event = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
            element.dispatchEvent(event);
        }
        Logger.debug(element, 'clicked');
    }

    async function waitForElementToDisappear(selector, baseEl = document, timeoutMs = DEFAULT_ELEMENT_TIMEOUT_MS) {
        let timeout = timeoutMs;
        while (timeout > 0) {
            let element = baseEl.querySelector(selector);
            if (element === null) return true; // Disappeared
            await sleep(TIMEOUT_STEP_MS);
            timeout -= TIMEOUT_STEP_MS;
        }
        console.warn(`Element ${selector} did not disappear within ${timeoutMs}ms`);
        return false;
    }

    // ----------------------------------
    // PUBLISH LOGIC
    // ----------------------------------
    const VISIBILITY_PUBLISH_ORDER = {
        'Private': 0,
        'Unlisted': 1,
        'Public': 2,
    };

    // UPDATED SELECTORS FOR 2026
    const VIDEO_ROW_SELECTOR = 'ytcp-video-row';
    const DRAFT_MODAL_SELECTOR = 'ytcp-uploads-dialog, ytcp-full-video-details';
    const DRAFT_BUTTON_SELECTOR = '.edit-draft-button, a#video-title';
    const MADE_FOR_KIDS_SELECTOR = '#made-for-kids-group';
    const RADIO_BUTTON_SELECTOR = '[role="radio"], tp-yt-paper-radio-button';
    const VISIBILITY_STEPPER_SELECTOR = '#step-badge-3';
    const VISIBILITY_PAPER_BUTTONS_SELECTOR = 'ytcp-video-visibility-select, tp-yt-paper-radio-group';
    const SAVE_BUTTON_SELECTOR = '#done-button, #save-button';
    const DIALOG_CLOSE_BUTTON_SELECTOR = 'ytcp-dialog ytcp-button#close-button';

    class SuccessDialog {
        constructor(raw) { this.raw = raw; }
        async close() {
            const btn = await waitForElement(DIALOG_CLOSE_BUTTON_SELECTOR);
            if (btn) {
                click(btn);
                Logger.success('Closed success dialog');
                // Wait for the dialog to actually go away to prevent clicking under it
                await waitForElementToDisappear(DIALOG_CLOSE_BUTTON_SELECTOR);
            } else {
                Logger.warn('Success dialog Close button not found - likely already closed or never appeared');
            }
        }
    }

    class VisibilityModal {
        constructor(raw) { this.raw = raw; }

        async setVisibility() {
            const group = await waitForElement(VISIBILITY_PAPER_BUTTONS_SELECTOR, this.raw);
            const options = group.querySelectorAll(RADIO_BUTTON_SELECTOR);
            const index = VISIBILITY_PUBLISH_ORDER[VISIBILITY];
            click(options[index]);
            Logger.step(`Visibility set to ${VISIBILITY}`);
            await sleep(500);
        }

        async save() {
            const saveBtn = await waitForElement(SAVE_BUTTON_SELECTOR, this.raw);
            click(saveBtn);
            Logger.step('Save button clicked');
            await sleep(2000);
            return new SuccessDialog(document.body);
        }
    }

    class DraftModal {
        constructor(raw) { this.raw = raw; }

        async selectMadeForKids() {
            const nthChild = MADE_FOR_KIDS ? 1 : 2;
            const btn = await waitForElement(`${MADE_FOR_KIDS_SELECTOR} ${RADIO_BUTTON_SELECTOR}:nth-child(${nthChild})`, this.raw);
            click(btn);
            await sleep(500);
        }

        async goToVisibility() {
            const stepper = await waitForElement(VISIBILITY_STEPPER_SELECTOR, this.raw);
            click(stepper);
            await sleep(1000);
            return new VisibilityModal(this.raw);
        }
    }

    class VideoRow {
        constructor(raw) { this.raw = raw; }
        async openDraft() {
            const btn = await waitForElement(DRAFT_BUTTON_SELECTOR, this.raw);
            click(btn);
            const modalEl = await waitForElement(DRAFT_MODAL_SELECTOR);
            return new DraftModal(modalEl);
        }
    }

    async function publishDrafts() {
        const rows = [...document.querySelectorAll(VIDEO_ROW_SELECTOR)];
        const editableVideos = rows.filter(row => row.innerText.includes('Draft'));

        Logger.title(`Found ${editableVideos.length} drafts to publish...`);
        Logger.info(`Visibility: ${VISIBILITY}`);

        let count = 0;
        for (let rowEl of editableVideos) {
            count++;
            const videoTitle = rowEl.querySelector(DRAFT_BUTTON_SELECTOR)?.innerText || 'Unknown Video';
            Logger.title(`[${count}/${editableVideos.length}] Processing: ${videoTitle}`);

            try {
                const video = new VideoRow(rowEl);
                const draft = await video.openDraft();

                Logger.step('Setting Made For Kids...');
                await draft.selectMadeForKids();

                Logger.step('Moving to Visibility settings...');
                const visibility = await draft.goToVisibility();

                await visibility.setVisibility();
                const success = await visibility.save();

                Logger.step('Closing success dialog...');
                await success.close();

                Logger.success('Published!');
                await sleep(1000); // Cooldown between videos
            } catch (e) {
                Logger.error(`Failed to publish "${videoTitle}": ${e.message}`);
                console.error(e);
            }
        }
        Logger.title("🎉 Finished publishing drafts.");
    }

    // ENTRY POINT
    if (MODE === 'publish_drafts') {
        publishDrafts();
    }
})();