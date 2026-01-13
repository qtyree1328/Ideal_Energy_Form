// Deregulated States Data for Ideal Energy
// Single source of truth for state deregulation status, tooltips, and map symbology

// Symbology categories:
// 'both' = Both electricity and gas deregulated (not limited)
// 'electric_only' = Only electricity deregulated (not limited)
// 'gas_only' = Only gas deregulated (not limited)
// 'partial' = Any limited/partial deregulation
// 'none' = No energy choice

export const STATE_DATA = {
  // BOTH ELECTRICITY AND GAS DEREGULATED (NOT LIMITED)
  CT: {
    name: 'Connecticut',
    category: 'both',
    electricity: true,
    gas: true,
    limited: false,
    description: 'In Connecticut, both electricity and natural gas are deregulated and available to residential and commercial customers.'
  },
  DE: {
    name: 'Delaware',
    category: 'both',
    electricity: true,
    gas: true,
    limited: false,
    description: 'In Delaware, both electricity and natural gas are deregulated and available to residential and commercial customers.'
  },
  IL: {
    name: 'Illinois',
    category: 'both',
    electricity: true,
    gas: true,
    limited: false,
    description: 'In Illinois, both electricity and natural gas are deregulated and available to residential and commercial customers.'
  },
  ME: {
    name: 'Maine',
    category: 'both',
    electricity: true,
    gas: true,
    limited: false,
    description: 'In Maine, both electricity and natural gas are deregulated and available to residential and commercial customers.'
  },
  MD: {
    name: 'Maryland',
    category: 'both',
    electricity: true,
    gas: true,
    limited: false,
    description: 'In Maryland, both electricity and natural gas are deregulated and available to residential and commercial customers.'
  },
  MA: {
    name: 'Massachusetts',
    category: 'both',
    electricity: true,
    gas: true,
    limited: false,
    description: 'In Massachusetts, both electricity and natural gas are deregulated and available to residential and commercial customers.'
  },
  NH: {
    name: 'New Hampshire',
    category: 'both',
    electricity: true,
    gas: true,
    limited: false,
    description: 'In New Hampshire, both electricity and natural gas are deregulated and available to residential and commercial customers.'
  },
  NJ: {
    name: 'New Jersey',
    category: 'both',
    electricity: true,
    gas: true,
    limited: false,
    description: 'In New Jersey, both electricity and natural gas are deregulated and available to residential and commercial customers.'
  },
  NY: {
    name: 'New York',
    category: 'both',
    electricity: true,
    gas: true,
    limited: false,
    description: 'In New York, both electricity and natural gas are deregulated and available to residential and commercial customers.'
  },
  OH: {
    name: 'Ohio',
    category: 'both',
    electricity: true,
    gas: true,
    limited: false,
    description: 'In Ohio, both electricity and natural gas are deregulated and available to residential and commercial customers.'
  },
  PA: {
    name: 'Pennsylvania',
    category: 'both',
    electricity: true,
    gas: true,
    limited: false,
    description: 'In Pennsylvania, both electricity and natural gas are deregulated and available to residential and commercial customers.'
  },
  RI: {
    name: 'Rhode Island',
    category: 'both',
    electricity: true,
    gas: true,
    limited: false,
    description: 'In Rhode Island, both electricity and natural gas are deregulated and available to residential and commercial customers.'
  },
  DC: {
    name: 'District of Columbia',
    category: 'both',
    electricity: true,
    gas: true,
    limited: false,
    description: 'In Washington DC, both electricity and natural gas are deregulated and available to residential and commercial customers.'
  },

  // ELECTRICITY ONLY (NOT LIMITED)
  TX: {
    name: 'Texas',
    category: 'electric_only',
    electricity: true,
    gas: false,
    limited: false,
    description: 'In Texas, electricity is deregulated and available to residential and commercial customers.'
  },
  OR: {
    name: 'Oregon',
    category: 'electric_only',
    electricity: true,
    gas: false,
    limited: false,
    description: 'Oregon is the only US state where electricity is deregulated while gas remains regulated.'
  },

  // GAS ONLY (NOT LIMITED)
  KY: {
    name: 'Kentucky',
    category: 'gas_only',
    electricity: false,
    gas: true,
    limited: false,
    description: 'In Kentucky, natural gas is deregulated and available for residential and commercial customers.'
  },
  MT: {
    name: 'Montana',
    category: 'gas_only',
    electricity: false,
    gas: true,
    limited: false,
    description: 'In Montana, natural gas is deregulated and available for residential and small business customers.'
  },

  // PARTIAL/LIMITED DEREGULATION
  CA: {
    name: 'California',
    category: 'partial',
    electricity: true,
    gas: true,
    limited: true,
    description: 'While both electricity and natural gas are deregulated in CA, electric choice is only available through a lottery system.'
  },
  CO: {
    name: 'Colorado',
    category: 'partial',
    electricity: false,
    gas: true,
    limited: true,
    description: 'In Colorado, natural gas choice enacted by law, but there are no provider options as of 2025.'
  },
  FL: {
    name: 'Florida',
    category: 'partial',
    electricity: false,
    gas: true,
    limited: true,
    description: 'In Florida, natural gas is deregulated statewide for commercial and industrial customers, but retail choice for residential customers is currently limited to the Central Florida Gas (CFG) service territory.'
  },
  GA: {
    name: 'Georgia',
    category: 'partial',
    electricity: true,
    gas: false,
    limited: true,
    description: 'LIMITED OPTIONS: Not available to residential customers. Electric choice is only available for commercial and industrial users with a load of at least 900 kW, located outside of municipal limits. Electric choice also applies for new municipalities and areas annexed to a municipality after 1973.'
  },
  IN: {
    name: 'Indiana',
    category: 'partial',
    electricity: false,
    gas: true,
    limited: true,
    description: 'In Indiana, natural gas choice is available to both commercial customers and residential customers in specific service territories, such as Northern Indiana Public Service Company (NIPSCO).'
  },
  KS: {
    name: 'Kansas',
    category: 'partial',
    electricity: false,
    gas: true,
    limited: true,
    description: 'In Kansas, natural gas choice is only available for large customers using 800-1500 MCF per year.'
  },
  MI: {
    name: 'Michigan',
    category: 'partial',
    electricity: true,
    gas: false,
    limited: true,
    description: 'In Michigan, electric choice is limited to 10% of a utility company\'s retail sales, and there is a long waiting list to switch your electric provider.'
  },
  NE: {
    name: 'Nebraska',
    category: 'partial',
    electricity: false,
    gas: true,
    limited: true,
    description: 'In Nebraska, the ability to select an alternative natural gas supplier (retail choice) is restricted to an annual enrollment period, typically two weeks in April, for both residential and business customers.'
  },
  NV: {
    name: 'Nevada',
    category: 'partial',
    electricity: false,
    gas: true,
    limited: true,
    description: 'In Nevada there is no choice of residential natural gas, but limited options available for commercial and industrial customers using more than 500 therms per day.'
  },
  NM: {
    name: 'New Mexico',
    category: 'partial',
    electricity: false,
    gas: true,
    limited: true,
    description: 'In New Mexico, Natural gas choice is enabled by law, but options are very limited.'
  },
  SD: {
    name: 'South Dakota',
    category: 'partial',
    electricity: false,
    gas: true,
    limited: true,
    description: 'In South Dakota, natural gas choice is enabled by law, but options are very limited for residential users.'
  },
  TN: {
    name: 'Tennessee',
    category: 'partial',
    electricity: false,
    gas: true,
    limited: true,
    description: 'In Tennessee, natural gas choice is only available to commercial and industrial users with an average consumption of more than 500 therms per day.'
  },
  VA: {
    name: 'Virginia',
    category: 'partial',
    electricity: true,
    gas: false,
    limited: true,
    description: 'In Virginia, electric choice is only available for commercial and industrial consumers. Residential customers only qualify if they are looking for a 100% renewable energy plan, and only when this option is not available from their local utility company.'
  },
  WV: {
    name: 'West Virginia',
    category: 'partial',
    electricity: false,
    gas: true,
    limited: true,
    description: 'West Virginia\'s energy market is primarily regulated for electricity, but it offers limited, partial deregulation for natural gas.'
  },
  WI: {
    name: 'Wisconsin',
    category: 'partial',
    electricity: false,
    gas: true,
    limited: true,
    description: 'In Wisconsin, natural gas choice is available for commercial and industrial users with a consumption of more than 5,000 therms per year.'
  },
  WY: {
    name: 'Wyoming',
    category: 'partial',
    electricity: false,
    gas: true,
    limited: true,
    description: 'Wyoming has a partially deregulated natural gas market, which is very limited in scope.'
  },

  // NO ENERGY CHOICE
  AL: {
    name: 'Alabama',
    category: 'none',
    electricity: false,
    gas: false,
    limited: false,
    description: 'Alabama does not have energy choice.'
  },
  AK: {
    name: 'Alaska',
    category: 'none',
    electricity: false,
    gas: false,
    limited: false,
    description: 'Alaska does not have energy choice.'
  },
  AZ: {
    name: 'Arizona',
    category: 'none',
    electricity: false,
    gas: false,
    limited: false,
    description: 'Arizona does not have energy choice.'
  },
  AR: {
    name: 'Arkansas',
    category: 'none',
    electricity: false,
    gas: false,
    limited: false,
    description: 'Arkansas does not have energy choice.'
  },
  HI: {
    name: 'Hawaii',
    category: 'none',
    electricity: false,
    gas: false,
    limited: false,
    description: 'Hawaii does not have energy choice.'
  },
  ID: {
    name: 'Idaho',
    category: 'none',
    electricity: false,
    gas: false,
    limited: false,
    description: 'Idaho does not have energy choice.'
  },
  IA: {
    name: 'Iowa',
    category: 'none',
    electricity: false,
    gas: false,
    limited: false,
    description: 'Iowa does not have energy choice.'
  },
  LA: {
    name: 'Louisiana',
    category: 'none',
    electricity: false,
    gas: false,
    limited: false,
    description: 'Louisiana does not have energy choice.'
  },
  MN: {
    name: 'Minnesota',
    category: 'none',
    electricity: false,
    gas: false,
    limited: false,
    description: 'Minnesota does not have energy choice.'
  },
  MS: {
    name: 'Mississippi',
    category: 'none',
    electricity: false,
    gas: false,
    limited: false,
    description: 'Mississippi does not have energy choice.'
  },
  MO: {
    name: 'Missouri',
    category: 'none',
    electricity: false,
    gas: false,
    limited: false,
    description: 'Missouri does not have energy choice.'
  },
  NC: {
    name: 'North Carolina',
    category: 'none',
    electricity: false,
    gas: false,
    limited: false,
    description: 'North Carolina does not have energy choice.'
  },
  ND: {
    name: 'North Dakota',
    category: 'none',
    electricity: false,
    gas: false,
    limited: false,
    description: 'North Dakota does not have energy choice.'
  },
  OK: {
    name: 'Oklahoma',
    category: 'none',
    electricity: false,
    gas: false,
    limited: false,
    description: 'Oklahoma does not have energy choice.'
  },
  SC: {
    name: 'South Carolina',
    category: 'none',
    electricity: false,
    gas: false,
    limited: false,
    description: 'South Carolina does not have energy choice.'
  },
  UT: {
    name: 'Utah',
    category: 'none',
    electricity: false,
    gas: false,
    limited: false,
    description: 'Utah does not have energy choice.'
  },
  VT: {
    name: 'Vermont',
    category: 'none',
    electricity: false,
    gas: false,
    limited: false,
    description: 'Vermont does not have energy choice.'
  },
  WA: {
    name: 'Washington',
    category: 'none',
    electricity: false,
    gas: false,
    limited: false,
    description: 'Washington does not have energy choice.'
  }
};

/**
 * Check if a state has any energy deregulation (Ideal eligibility)
 * @param {string} stateCode - Two-letter state code
 * @returns {object} - Eligibility information
 */
export function checkIdealEligibility(stateCode) {
  const code = stateCode?.toUpperCase();
  const stateInfo = STATE_DATA[code];

  if (!stateInfo) {
    return {
      eligible: false,
      status: 'unknown',
      hasElectricity: false,
      hasGas: false,
      isLimited: false,
      stateName: 'Unknown',
      message: 'State not found in database'
    };
  }

  const eligible = stateInfo.electricity || stateInfo.gas;
  const isLimited = stateInfo.limited;

  return {
    eligible,
    status: stateInfo.category,
    hasElectricity: stateInfo.electricity,
    hasGas: stateInfo.gas,
    electricityStatus: stateInfo.electricity ? (stateInfo.limited ? 'partial' : 'full') : 'none',
    gasStatus: stateInfo.gas ? (stateInfo.limited ? 'partial' : 'full') : 'none',
    isLimited,
    stateName: stateInfo.name,
    description: stateInfo.description,
    message: eligible
      ? (isLimited ? 'Limited energy choice available' : 'Energy choice available')
      : 'No energy choice available'
  };
}

/**
 * Get available auction types for a state
 * @param {string} stateCode - Two-letter state code
 * @returns {object} - Available auction options
 */
export function getAvailableAuctionTypes(stateCode) {
  const eligibility = checkIdealEligibility(stateCode);

  return {
    electricity: eligibility.hasElectricity,
    gas: eligibility.hasGas,
    both: eligibility.hasElectricity && eligibility.hasGas,
    electricityStatus: eligibility.electricityStatus,
    gasStatus: eligibility.gasStatus
  };
}

/**
 * Get state info for map tooltip
 * @param {string} stateCode - Two-letter state code
 * @returns {object} - State information for display
 */
export function getStateTooltipInfo(stateCode) {
  const code = stateCode?.toUpperCase();
  const stateInfo = STATE_DATA[code];

  if (!stateInfo) {
    return null;
  }

  return {
    name: stateInfo.name,
    category: stateInfo.category,
    electricity: stateInfo.electricity,
    gas: stateInfo.gas,
    limited: stateInfo.limited,
    description: stateInfo.description
  };
}

/**
 * Get the CSS class for a state based on its deregulation category
 * @param {string} stateCode - Two-letter state code
 * @returns {string} - CSS class name
 */
export function getStateClass(stateCode) {
  const code = stateCode?.toUpperCase();
  const stateInfo = STATE_DATA[code];

  if (!stateInfo) return 'regulated';

  // Map category to CSS class
  switch (stateInfo.category) {
    case 'both':
      return 'deregulated';
    case 'electric_only':
      return 'electricity-only';
    case 'gas_only':
      return 'gas-only';
    case 'partial':
      return 'partial';
    case 'none':
    default:
      return 'regulated';
  }
}

/**
 * Get category label for display
 * @param {string} category - Category code
 * @returns {string} - Human readable label
 */
export function getCategoryLabel(category) {
  switch (category) {
    case 'both':
      return 'Full Access (Both)';
    case 'electric_only':
      return 'Electric Only';
    case 'gas_only':
      return 'Gas Only';
    case 'partial':
      return 'Limited Access';
    case 'none':
    default:
      return 'No Energy Choice';
  }
}
