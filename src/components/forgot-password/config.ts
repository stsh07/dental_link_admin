export const DISABLE_FORGOT_PASSWORD_API = true;

export const simulateDelay = (ms = 800) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
