const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const num = (v, d) => (v === undefined || v === '' || isNaN(+v) ? d : +v);
module.exports = { wrap, num };
