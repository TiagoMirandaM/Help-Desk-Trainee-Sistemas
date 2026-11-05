const listeners = new Set();

export function onUnauthorized(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitUnauthorized(reason = 'expired') {
  listeners.forEach((listener) => {
    try {
      listener(reason);
    } catch {
      // Um listener com erro não deve impedir os demais de reagir.
    }
  });
}
