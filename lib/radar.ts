// Token Radar — the valuation model (radar-2).
//
// The board ranks every protocol in the snapshot that records no token and is
// not a wrapped, staked or bridged product of a token that already trades:
// the watchlist rule, without the watchlist's $50M floor. The watchlist is
// the floor, never the ceiling, so the board also ranks the 138 pre-token
// protocols below it. Protocols whose token already trades are never ranked
// here; they are shown apart, at the market's own value.
//
// Implied value is the model's own claim, from the snapshot's figures alone:
//
//   implied = TVL x category multiple x growth factor x breadth factor
//             x maturity factor
//
//   category multiple  a per-category FDV/TVL multiple: what a token in
//                      that line of business has traded at, relative to
//                      the value locked in it. Stated in CATEGORY_MULTIPLE
//                      and on the dashboard; no protocol name is special.
//   growth factor      7-day TVL change, clamped to [-50, +150] per cent.
//                      Rises are rewarded at 0.6 per point, falls are
//                      punished at 1.0 per point: a protocol losing TVL
//                      fast is worth less than one merely standing still.
//                      No change reported counts as flat.
//   breadth factor     1 + 0.04 per extra chain, up to 6 extra chains
//                      (1.00-1.24): a protocol live on more chains reaches
//                      more users and more liquidity.
//   maturity factor    0.70 + 0.30 x min(age, 1095) / 1095: a protocol that
//                      has run longer with no token has a longer record to
//                      price, and a younger one a shorter one. Age unknown
//                      counts as 365 days. Age is measured from listed_at
//                      to the snapshot's as_of date.
//
// Nothing here is a launch prediction: the model says what a token would be
// worth if the protocol's record stayed as it is, not whether or when one
// is issued. A protocol "records no token" when DefiLlama's record carries
// no market cap, no CoinGecko id and no symbol for it; that is not proof it
// has none.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's version label: the dashboard names it. */
export const MODEL_VERSION = 'radar-2';

/** FDV/TVL multiple per DefiLlama category. Categories the table does not name use DEFAULT_MULTIPLE. */
export const CATEGORY_MULTIPLE: Readonly<Record<string, number>> = {
  'Chain': 0.5,
  'Prediction Market': 0.45,
  'Derivatives': 0.4,
  'Payments': 0.4,
  'RWA': 0.35,
  'Decentralized BTC': 0.35,
  'Privacy': 0.35,
  'Dexs': 0.3,
  'Risk Curators': 0.3,
  'Onchain Capital Allocator': 0.3,
  'Interest Rate Derivatives': 0.3,
  'Anchor BTC': 0.3,
  'Options Vault': 0.3,
  'Crypto Card Issuer': 0.3,
  'Dual-Token Stablecoin': 0.3,
  'Restaking': 0.3,
  'Lending': 0.28,
  'CDP': 0.28,
  'Collateral Markets': 0.28,
  'Basis Trading': 0.25,
  'Yield': 0.22,
  'Yield Aggregator': 0.22,
  'Staking Pool': 0.25,
  'Liquidity Manager': 0.25,
  'Leveraged Farming': 0.25,
  'CDP Manager': 0.25,
  'OTC Marketplace': 0.25,
  'Insurance': 0.25,
  'Indexes': 0.25,
  'Uncollateralized Lending': 0.2,
  'CeDeFi': 0.2,
  'Farm': 0.2,
  'Governance Incentives': 0.2,
  'Stablecoin Wrapper': 0.15,
  'Cross Chain Bridge': 0.15,
};

export const DEFAULT_MULTIPLE = 0.25;

/** Growth: reward per point of rise, punishment per point of fall, and the clamp. */
export const GROWTH_UP = 0.006;
export const GROWTH_DOWN = 0.01;
export const GROWTH_FLOOR = -50;
export const GROWTH_CAP = 150;

/** Breadth: per extra chain, up to this many extra chains. */
export const BREADTH_PER_CHAIN = 0.04;
export const BREADTH_MAX_CHAINS = 6;

/** Maturity: floor, range, days to full maturity, and the age assumed when unknown. */
export const MATURITY_FLOOR = 0.7;
export const MATURITY_RANGE = 0.3;
export const MATURITY_DAYS = 1095;
export const UNKNOWN_AGE_DAYS = 365;

/** The model's constants, as the dashboard states them. */
export const MODEL = {
  version: MODEL_VERSION,
  multiples: CATEGORY_MULTIPLE,
  default_multiple: DEFAULT_MULTIPLE,
  growth_up: GROWTH_UP,
  growth_down: GROWTH_DOWN,
  growth_floor: GROWTH_FLOOR,
  growth_cap: GROWTH_CAP,
  breadth_per_chain: BREADTH_PER_CHAIN,
  breadth_max_chains: BREADTH_MAX_CHAINS,
  maturity_floor: MATURITY_FLOOR,
  maturity_range: MATURITY_RANGE,
  maturity_days: MATURITY_DAYS,
  unknown_age_days: UNKNOWN_AGE_DAYS,
} as const;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: a ranked pre-token protocol. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    category_multiple: number;
    growth_pct: number;
    growth_factor: number;
    breadth_factor: number;
    maturity_factor: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  listed_at: string | null;
  age_days: number | null;
  watchlist: boolean;
  implied_value_usd: number;
  category_multiple: number;
  growth_factor: number;
  breadth_factor: number;
  maturity_factor: number;
  farm_steps: string[];
}

/** A live-token protocol: it already trades, so the board shows the market's own value. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** How many live-token protocols the dashboard's "Already trading" view carries, by market cap. */
export const LIVE_ROWS = 24;

/** Everything the dashboard needs: the board, the live set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model_version: string;
  model: typeof MODEL;
  watchlist_size: number;
  board_size: number;
  below_floor_size: number;
  live_size: number;
  total_implied_usd: number;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The four factors and the implied value one protocol gets. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
): { implied: number; multiple: number; growthPct: number; growth: number; breadth: number; maturity: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const multiple = CATEGORY_MULTIPLE[protocol.category ?? ''] ?? DEFAULT_MULTIPLE;
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(GROWTH_CAP, Math.max(GROWTH_FLOOR, rawGrowth));
  const growth = growthPct >= 0 ? 1 + growthPct * GROWTH_UP : 1 + growthPct * GROWTH_DOWN;
  const extraChains = Math.min(Math.max(protocol.chains.length - 1, 0), BREADTH_MAX_CHAINS);
  const breadth = 1 + extraChains * BREADTH_PER_CHAIN;
  const ageForModel = age ?? UNKNOWN_AGE_DAYS;
  const maturity = MATURITY_FLOOR + (Math.min(Math.max(ageForModel, 0), MATURITY_DAYS) / MATURITY_DAYS) * MATURITY_RANGE;
  const implied = Math.max(1, Math.round(protocol.tvl_usd * multiple * growth * breadth * maturity));
  return { implied, multiple, growthPct, growth, breadth, maturity, age };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;
/** A whole word that marks a wrapped, staked or staking product. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;
/** Categories the watchlist rule leaves out: wrapped, staked or bridged products of a token that trades. */
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);
/** Exchange names a protocol name must not begin with. */
const EXCHANGE_NAMES = ['Binance', 'Coinbase', 'Bybit', 'Kraken', 'Bitget', 'OKX', 'Bitfinex', 'Gemini'];

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/**
 * Whether a protocol is one the board may rank: pre-token, and not a
 * wrapped, staked or bridged product of a token that already trades. This is
 * the watchlist's rule, without its TVL floor.
 */
export function isRankable(p: SnapshotProtocol): boolean {
  if (!isPreToken(p)) return false;
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) return false;
  if (VERSIONED.test(p.name)) return false;
  if (WRAPPED_WORD.test(p.name)) return false;
  if (EXCHANGE_NAMES.some((e) => p.name.startsWith(e))) return false;
  return true;
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug on it is ranked, whatever its
  // category or size. A slug the snapshot no longer carries cannot be
  // ranked, but the gate's coverage is never gambled on a missing record.
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // Below the floor: every other rankable pre-token protocol, not just the
  // largest few. The radar exists to find these early.
  for (const p of snapshot.protocols) {
    if (!chosen.has(p.slug) && isRankable(p)) chosen.set(p.slug, p);
  }

  const scored = [...chosen.values()].map((p) => {
    const v = impliedValue(p, snapshot.as_of);
    return { p, ...v };
  });
  scored.sort(
    (a, b) =>
      b.implied - a.implied ||
      b.p.tvl_usd - a.p.tvl_usd ||
      (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0),
  );
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.age,
    implied_value_usd: s.implied,
    model: {
      category_multiple: s.multiple,
      growth_pct: s.growthPct,
      growth_factor: round4(s.growth),
      breadth_factor: round4(s.breadth),
      maturity_factor: round4(s.maturity),
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
  }));
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 1_000_000_000) return 250;
  if (p.tvl_usd >= 500_000_000) return 200;
  if (p.tvl_usd >= 100_000_000) return 150;
  if (p.tvl_usd >= 50_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 45;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's playbook: the core action, the second action, and the weekly action. */
interface Playbook {
  core: string;
  second: string;
  weekly: string;
}

function playbookFor(p: SnapshotProtocol, capital: number, chain: string): Playbook {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) {
    return {
      core: `Supply $${capital} of USDC to ${name} on ${chain} and leave it earning while you farm.`,
      second: `Borrow $25 of a stablecoin against the supply, hold it a week, then repay it in full so the loan is counted and closed.`,
      weekly: `Top the supply up by $10, or make one small borrow and repayment, so the wallet shows fresh activity every week.`,
    };
  }
  if (c.includes('dex') || c.includes('liquidity manager') || c.includes('farm')) {
    return {
      core: `Add $${capital} of liquidity to ${name}'s deepest pool on ${chain} and keep the position in range.`,
      second: `Swap $25 through ${name} on ${chain} in the other direction, then add the received tokens to the same pool.`,
      weekly: `Make one swap of $10 or more through ${name} and collect any fees the pool paid out that week.`,
    };
  }
  if (c.includes('yield') || c.includes('risk curator') || c.includes('capital allocator') || c.includes('basis trading') || c.includes('leveraged')) {
    return {
      core: `Deposit $${capital} of USDC into the largest ${name} vault on ${chain} and hold the vault shares.`,
      second: `Claim any yield the vault paid, then redeposit it into the same vault so the balance compounds.`,
      weekly: `Check the vault's yield, harvest what it paid, and redeposit it instead of letting it sit idle.`,
    };
  }
  if (c.includes('derivative') || c.includes('perpetual') || c.includes('options')) {
    return {
      core: `Deposit $${capital} of USDC as margin on ${name} on ${chain} and open one small position worth no more than a fifth of it.`,
      second: `Close the position, then open one limit order on ${name} so the account shows both market and limit activity.`,
      weekly: `Open and close one small position on ${name}, keeping the size under $25 so fees stay low.`,
    };
  }
  if (c.includes('rwa') || c.includes('anchor btc') || c.includes('decentralized btc') || c.includes('stablecoin wrapper') || c.includes('dual-token')) {
    return {
      core: `Mint or buy $${capital} of ${name}'s yield-bearing asset on ${chain} and hold it in the farming wallet.`,
      second: `Send a $10 slice of the position to a second wallet you control, then send it back, so the asset moves on chain.`,
      weekly: `Check the yield the asset accrued and, once a month, add $10 more to the position.`,
    };
  }
  if (c === 'chain') {
    return {
      core: `Bridge $${capital} of USDC onto ${name} and use it in the chain's largest app, keeping the funds on the chain.`,
      second: `Make one swap and one deposit inside ${name}'s own ecosystem apps so the wallet is active on the chain itself.`,
      weekly: `Run one transaction a week on ${name} — a swap, a deposit or a vote — so the address stays active.`,
    };
  }
  if (c.includes('prediction')) {
    return {
      core: `Fund ${name} with $${capital} and take one position of $25 in a market that settles within the month.`,
      second: `Take a second, smaller position on the opposite side of a different market so the account shows range.`,
      weekly: `Place one small position a week on ${name}, sized $5 to $10, and let it settle instead of trading it out.`,
    };
  }
  if (c.includes('staking') || c.includes('restak')) {
    return {
      core: `Stake $${capital} of the chain's staking asset through ${name} on ${chain} and keep the receipt token.`,
      second: `Use the receipt token once in a supported app on ${chain}, then return it to the staking position.`,
      weekly: `Check the staking rewards ${name} paid and restake them instead of withdrawing.`,
    };
  }
  if (c.includes('payment') || c.includes('card')) {
    return {
      core: `Load $${capital} onto ${name} on ${chain} and make one real payment with it this week.`,
      second: `Make a second payment of $10 or more through ${name} and keep the receipt for the farm log.`,
      weekly: `Spend $10 or more through ${name} each week so the account shows steady real use.`,
    };
  }
  if (c.includes('insurance')) {
    return {
      core: `Buy $${capital} of cover from ${name} on ${chain} for a position you already hold.`,
      second: `Extend the cover by 30 days once it is live, so the policy runs through the next snapshot.`,
      weekly: `Check the policy's status on ${name} and renew it before it lapses.`,
    };
  }
  if (c.includes('governance')) {
    return {
      core: `Deposit $${capital} into ${name}'s voting pool on ${chain} and vote in the next live proposal.`,
      second: `Delegate $25 of the position to an active delegate on ${name} and keep the rest voting yourself.`,
      weekly: `Vote on every new proposal ${name} opens, even a routine one, so the wallet's voting record grows.`,
    };
  }
  if (c.includes('index')) {
    return {
      core: `Buy $${capital} of ${name}'s index token on ${chain} and hold it in the farming wallet.`,
      second: `Mint $25 of the index directly through ${name} instead of buying it, so both routes are used.`,
      weekly: `Add $10 to the index position each week and check its rebalance.`,
    };
  }
  return {
    core: `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`,
    second: `Use ${name}'s second main feature once — a swap, a second deposit or a vote — so the wallet touches more than one function.`,
    weekly: `Make one qualifying action a week on ${name}, such as a deposit, a swap or a vote.`,
  };
}

/**
 * A protocol's farm plan: six steps, each an action with a cost and a time.
 * The plan is derived from the protocol's own record (category, chains, TVL,
 * age), never from a hand-written list of names.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const book = playbookFor(p, capital, chain);
  const gas = capital >= 150 ? 8 : 4;
  return [
    {
      text: `Set up a fresh wallet that holds only the funds you plan to farm with, write its seed phrase on paper and keep it offline, then fund it with $${capital} plus gas.`,
      cost: `about $${gas} of gas for the first transaction`,
      time: '10 minutes to set up',
    },
    {
      text: book.core,
      cost: `$${capital} of capital and about $${gas} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: book.second,
      cost: 'about $3 of gas, plus the $25 moved',
      time: '15 minutes',
    },
    {
      text: book.weekly,
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: `Open ${p.name}'s own docs and points page from its official site, and complete any quest or task it lists for this week; if it runs no points program yet, join its governance forum or community channel and read the latest proposal.`,
      cost: 'no fee to check, and never pay to claim',
      time: '15 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot, then check ${p.name}'s own announcements before you withdraw. Write the wallet, the dates and every transaction in a farm log.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days, then 10 minutes to unwind`,
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's "Already trading" view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** A board row's compact form for data.js. */
export function radarRow(row: BoardRow, watchlist: ReadonlySet<string>): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    listed_at: row.listed_at,
    age_days: row.age_days,
    watchlist: watchlist.has(row.slug),
    implied_value_usd: row.implied_value_usd,
    category_multiple: row.model.category_multiple,
    growth_factor: row.model.growth_factor,
    breadth_factor: row.model.breadth_factor,
    maturity_factor: row.model.maturity_factor,
    farm_steps: row.farm_steps,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot);
  const live = liveRows(snapshot);
  const belowFloor = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const totalImplied = board.reduce((n, r) => n + r.implied_value_usd, 0);
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model_version: MODEL_VERSION,
    model: MODEL,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    below_floor_size: belowFloor,
    live_size: live.length,
    total_implied_usd: totalImplied,
    rows: board.map((r) => radarRow(r, new Set(snapshot.watchlist))),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) {
      const t = s.trim();
      if (t.length < 20 || t.length > 600) return `${r.slug} has a farm step of ${t.length} characters`;
    }
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
