export const RATE_RNR  = 1430;
export const RATE_REPL = 1522;
export const RATE_CBR  = 1857;
export const OH_RATE   = 3075;

export function getRate(dispLabel) {
  if (dispLabel.includes("Replace") || dispLabel.includes("Deloitte")) return RATE_REPL;
  if (dispLabel.includes("Complex Big Rock")) return RATE_CBR;
  return RATE_RNR;
}

export function rowPrice(stf, oh, rate) {
  return stf * rate + oh * OH_RATE;
}

// Backward-compat wrapper for existing tab code that passes a row object
export function rp(r) {
  return r.stf * r.rate + r.oh * OH_RATE;
}

export function groupPrice(dispositions, platTotalCost) {
  return dispositions.reduce((s, d) => s + rowPrice(d.stf, d.oh, getRate(d.disp)), 0)
    + platTotalCost * 1e6;
}

export function portfolioPrice(groups) {
  return groups.reduce((s, g) => s + groupPrice(g.dispositions ?? g.rows, g.platTotalCost ?? g.plat?.total_cost), 0);
}

export function perApp(price, apps) {
  return apps > 0 ? price / apps : 0;
}
