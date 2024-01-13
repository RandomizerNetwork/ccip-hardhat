export const THREE_MONTHS_IN_DAYS    = 30;
export const SIX_MONTHS_IN_DAYS      = 182;
export const ONE_YEAR_IN_DAYS        = 365;
export const EIGHTEEN_MONTHS_IN_DAYS = 547;
export const TWO_YEARS_IN_DAYS       = 730;
export const THREE_YEARS_IN_DAYS     = 1095;

// Calculate one year in seconds (assuming 365 days for simplicity)
export const halfYearInSeconds = 182 * 24 * 60 * 60;
export const oneYearInSeconds = 365 * 24 * 60 * 60;
export const twoYearsInSeconds = oneYearInSeconds * 2;
export const threeYearsInSeconds = oneYearInSeconds * 3;

// LOCKING CLIFF TIME
export const CLIFF_DAO_RESERVE = SIX_MONTHS_IN_DAYS
export const CLIFF_PARTNERSHIP = SIX_MONTHS_IN_DAYS
export const CLIFF_PRIVATE_SALE = SIX_MONTHS_IN_DAYS
export const CLIFF_PUBLIC_SALE = 0
export const CLIFF_TEAM = SIX_MONTHS_IN_DAYS
export const CLIFF_TREASURY = THREE_MONTHS_IN_DAYS
export const CLIFF_AIRDROP = 0
export const CLIFF_BUILD = 0
export const CLIFF_LP_RESERVER = 0
export const CLIFF_ECOSYSTEM_FUND = 0

// LOCKING AMOUNT
export const DAO_RESERVE    = "453333337"   // 51%
export const PARTNERSHIP    = "17777777"    // 2%
export const PRIVATE_SALE   = "4444444"     // 0.5%
export const PUBLIC_SALE    = "71111111"    // 8%
export const TEAM           = "111111111"   // 12.5%
export const TREASURY       = "26666666"    // 3%
export const AIRDROP        = "35555555"    // 4%
export const BUILD          = "35555555"    // 4%
export const LP_RESERVER    = "44444444"    // 5%
export const ECOSYSTEM_FUND = "88888888"    // 10%


// LOCKING LINEAR VEST TIME
export const VESTING_DAO_RESERVE = THREE_YEARS_IN_DAYS
export const VESTING_PARTNERSHIP = TWO_YEARS_IN_DAYS
export const VESTING_PRIVATE_SALE = EIGHTEEN_MONTHS_IN_DAYS
export const VESTING_PUBLIC_SALE = 0
export const VESTING_TEAM = TWO_YEARS_IN_DAYS
export const VESTING_TREASURY = TWO_YEARS_IN_DAYS
export const VESTING_AIRDROP = 0
export const VESTING_BUILD = 0
export const VESTING_LP_RESERVER = 0
export const VESTING_ECOSYSTEM_FUND = 0