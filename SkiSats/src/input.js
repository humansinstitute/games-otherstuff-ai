const inputState = {
  initialized: false,
  target: null,
  keysDown: new Set(),
  keysPressed: new Set(),
  touchActive: false,
  touchStartX: null,
  touchCurrentX: null,
  tapped: false,
  isTouchDevice: false,
};

function handleKeyDown(event) {
  if (!event.repeat) {
    inputState.keysPressed.add(event.code);
  }
  inputState.keysDown.add(event.code);
}

function handleKeyUp(event) {
  inputState.keysDown.delete(event.code);
}

function handleTouchStart(event) {
  event.preventDefault(); // Prevent default touch behavior
  inputState.isTouchDevice = true;
  const touch = event.touches[0];
  inputState.touchStartX = touch.clientX;
  inputState.touchCurrentX = touch.clientX;
  inputState.touchActive = true;
  inputState.tapped = true;
}

function handleTouchMove(event) {
  event.preventDefault(); // Prevent default touch behavior
  if (inputState.touchActive && event.touches.length > 0) {
    const touch = event.touches[0];
    inputState.touchCurrentX = touch.clientX;
  }
}

function handleTouchEnd(event) {
  event.preventDefault(); // Prevent default touch behavior
  inputState.touchActive = false;
  inputState.touchStartX = null;
  inputState.touchCurrentX = null;
}

export function initializeInput(target = typeof window !== 'undefined' ? window : null) {
  if (inputState.initialized || !target) {
    return;
  }

  inputState.target = target;
  inputState.target.addEventListener('keydown', handleKeyDown);
  inputState.target.addEventListener('keyup', handleKeyUp);

  // Add touch event listeners (not passive so we can preventDefault)
  inputState.target.addEventListener('touchstart', handleTouchStart, { passive: false });
  inputState.target.addEventListener('touchmove', handleTouchMove, { passive: false });
  inputState.target.addEventListener('touchend', handleTouchEnd, { passive: false });

  // Detect if device has touch capability
  inputState.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  inputState.initialized = true;
}

function ensureInitialized() {
  if (!inputState.initialized) {
    initializeInput();
  }
}

export function isLeftPressed() {
  ensureInitialized();
  return (
    inputState.keysDown.has('ArrowLeft') || inputState.keysDown.has('KeyA')
  );
}

export function isRightPressed() {
  ensureInitialized();
  return (
    inputState.keysDown.has('ArrowRight') || inputState.keysDown.has('KeyD')
  );
}

export function wasKeyPressed(code) {
  ensureInitialized();
  return inputState.keysPressed.has(code);
}

export function postInputUpdate() {
  ensureInitialized();
  inputState.keysPressed.clear();
  inputState.tapped = false;
}

export function isTouchLeft() {
  ensureInitialized();
  if (!inputState.touchActive || inputState.touchCurrentX === null) {
    return false;
  }
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
  return inputState.touchCurrentX < screenWidth / 2;
}

export function isTouchRight() {
  ensureInitialized();
  if (!inputState.touchActive || inputState.touchCurrentX === null) {
    return false;
  }
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
  return inputState.touchCurrentX >= screenWidth / 2;
}

export function wasTapped() {
  ensureInitialized();
  return inputState.tapped;
}

export function isTouchDevice() {
  ensureInitialized();
  return inputState.isTouchDevice;
}

export function getTouchDebugInfo() {
  ensureInitialized();
  return {
    active: inputState.touchActive,
    currentX: inputState.touchCurrentX,
    screenWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
    isLeft: isTouchLeft(),
    isRight: isTouchRight()
  };
}

// Export raw input state to window for renderer access
export function exposeInputState() {
  if (typeof window !== 'undefined') {
    window.__inputState = inputState;
  }
}

initializeInput();
exposeInputState();
