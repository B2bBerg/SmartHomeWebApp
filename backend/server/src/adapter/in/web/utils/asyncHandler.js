/**
 * adapter/in/web/utils/asyncHandler.js
 *
 * Wrapper für asynchrone Express-Routenhandler.
 * Fängt Promise-Rejections und leitet sie an die `next()`-Funktion weiter.
 */
export const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);