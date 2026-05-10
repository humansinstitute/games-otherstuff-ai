const root = document.documentElement;
const overlay = document.getElementById('mobileOrientationOverlay');

const updateSafeViewportHeight = () => {
    const measured = window.innerHeight || root.clientHeight || window.screen?.height;
    if (!measured) return;
    root.style.setProperty('--app-safe-height', `${measured}px`);
};

let updateOverlay = null;

if (overlay) {
    const portraitQuery = window.matchMedia('(orientation: portrait)');
    const coarsePointerQuery = window.matchMedia('(pointer: coarse)');
    const hoverNoneQuery = window.matchMedia('(hover: none)');

    const queries = [portraitQuery, coarsePointerQuery, hoverNoneQuery].filter(Boolean);

    const hasTouchInput = () => {
        const coarse = coarsePointerQuery?.matches ?? false;
        const hoverNone = hoverNoneQuery?.matches ?? false;
        const legacyTouchSupport = 'ontouchstart' in window;
        return coarse || hoverNone || legacyTouchSupport;
    };

    const shouldShowOverlay = () => {
        const isPortrait = portraitQuery?.matches ?? false;
        return hasTouchInput() && isPortrait;
    };

    updateOverlay = () => {
        const show = shouldShowOverlay();
        overlay.classList.toggle('is-visible', show);
        overlay.setAttribute('aria-hidden', (!show).toString());
    };

    const bindQuery = (query) => {
        if (!query) return;
        if (typeof query.addEventListener === 'function') {
            query.addEventListener('change', updateOverlay);
        } else if (typeof query.addListener === 'function') {
            query.addListener(updateOverlay);
        }
    };

    queries.forEach(bindQuery);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            updateOverlay();
        }, { once: true });
    } else {
        updateOverlay();
    }
}

const syncViewportUIState = () => {
    updateSafeViewportHeight();
    if (updateOverlay) {
        updateOverlay();
    }
};

syncViewportUIState();

window.addEventListener('resize', syncViewportUIState);
window.addEventListener('orientationchange', () => {
    setTimeout(syncViewportUIState, 100);
});
