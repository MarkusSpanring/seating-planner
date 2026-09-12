// ===== Sitzplan Event Bus =====

const listeners = new Map();

export const events = {
  on(event, handler) {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event).add(handler);
    return () => this.off(event, handler);
  },

  off(event, handler) {
    if (listeners.has(event)) {
      listeners.get(event).delete(handler);
    }
  },

  emit(event, data) {
    if (listeners.has(event)) {
      listeners.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (err) {
          console.error(`Error in event handler for "${event}":`, err);
        }
      });
    }
  }
};

