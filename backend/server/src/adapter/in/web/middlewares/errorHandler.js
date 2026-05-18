/**
 * adapter/in/web/middlewares/errorHandler.js
 *
 * Zentrale Express Error-Handling Middleware.
 * Fängt alle Fehler, die in den Controllern via `next(error)` weitergereicht werden.
 */
export const errorHandler = (err, req, res, next) => {
    // Loggt den kompletten Fehler für Debugging-Zwecke auf dem Server
    console.error(err);

    // Setzt den Statuscode aus dem Fehlerobjekt, oder 500 als Fallback
    const status = err.status || 500;
    const message = err.message || 'Ein interner Serverfehler ist aufgetreten.';

    // Sendet eine standardisierte JSON-Fehlerantwort an den Client
    res.status(status).json({
        message: status === 400 ? 'Validierungsfehler' : 'Fehler',
        error: message
    });
};