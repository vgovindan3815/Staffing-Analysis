// ── COLOUR PALETTE ────────────────────────────────────────────────────────────
export const PC = {
  Commercial:             "#5E35B1",
  Operations:             "#991B1B",
  "Technology Platforms": "#185FA5",
  "Back Office":          "#0E7490",
};
export const TEAL = "#A100FF";
export const NAVY = "#000000";
export const TRACK_COL = {
  "Kafka / JMS":          "#185FA5",
  "MuleSoft API Integ.":  "#5E35B1",
  "DevOps - Jenkins/GHA": "#546E7A",
  "PCF - OpenShift":      "#0E7490",
};
export const LEVEL_COL = {
  "Accenture Leadership":   "#5E35B1",
  "5-Associate Director":   "#7C3AED",
  "6-Senior Manager":       "#1565C0",
  "7-Manager":              "#185FA5",
  "8-Associate Manager":    "#0E7490",
  "9-Team Lead/Consultant": "#2E7D32",
  "10-Senior Analyst":      "#B45309",
  "11-Analyst":             "#991B1B",
  "12-Associate":           "#6B7280",
  "subk":                   "#92400E",
};
export const GROUP_COL = {
  "Program Leadership":                        "#5E35B1",
  "Architecture":                              "#185FA5",
  "ACMA Wave Management":                      "#7C3AED",
  "Infrastructure & Cloud":                    "#546E7A",
  "Platform Tracks":                           "#0E7490",
  "App Migration-Commercial":                  "#1565C0",
  "App Migration-Back Office":                 "#2E7D32",
  "App Migration-Operations":                  "#B45309",
  "Data Portfolio":                            "#0891B2",
  "Testing & Quality":                         "#991B1B",
  "Custom Solution-Security":                  "#DC2626",
  "Custom Solution-ServiceNow":                "#7C3AED",
  "Custom Solution-EUC":                       "#D97706",
  "Custom Solution-Observability":             "#059669",
  "Change Enablement":                         "#6366F1",
  "Projects-Backoffice":                       "#0E7490",
  "Project-Commercial":                        "#1565C0",
  "Project DS TIBCO BE Replacement":           "#546E7A",
  "Project Linehaul Driver Admin enhancement": "#B45309",
  "Project-ServiceNow":                        "#7C3AED",
  "Security-Enhancement":                      "#991B1B",
  "Salesforce -NLA":                           "#0891B2",
};

// ── RATES ─────────────────────────────────────────────────────────────────────
export const RATE_RNR  = 1430;
export const RATE_REPL = 1522;
export const RATE_CBR  = 1857;
export const OH_RATE   = 3075;

// ── PORTFOLIOS ────────────────────────────────────────────────────────────────
// stf = Pricing Engine "Base Staffed" days; oh = Pricing Engine "OH Staffed" days.
// total_cost = sum(row plat_days) × $704/day / 1e6 — see Pricing Table section B.
// total_days = pricing platform pool days (differs from implementation track days).
export const PORTFOLIOS = [
  { name:"Commercial", apps:261, groups:[
    { label:"R&R + Clone", apps:249, rows:[
      { disp:"R&R - Standard",         apps:225, epApp:24,  stf:8084.44, oh:1799.14, rate:RATE_RNR },
      { disp:"R&R - Low Effort",        apps:4,   epApp:18,  stf:107.79,  oh:23.99,   rate:RATE_RNR },
      { disp:"Clone - Medium",          apps:1,   epApp:41,  stf:61.38,   oh:13.66,   rate:RATE_RNR },
      { disp:"Clone - Day 2 New Build", apps:9,   epApp:55,  stf:741.07,  oh:164.92,  rate:RATE_RNR },
      { disp:"Third Party Drivers",     apps:10,  epApp:24,  stf:359.31,  oh:79.96,   rate:RATE_RNR },
    ], plat:{ total_days:3306, total_cost:2.3277, tracks:[
      { name:"Kafka / JMS",          apps:52,  days:1601, cost:0.6708 },
      { name:"MuleSoft API Integ.",  apps:20,  days:696,  cost:0.6540 },
      { name:"DevOps - Jenkins/GHA", apps:168, days:1720, cost:2.7888 },
      { name:"PCF - OpenShift",      apps:53,  days:231,  cost:0.2359 },
    ]}},
    { label:"Replace", apps:11, rows:[
      { disp:"Replace (New App-High)", apps:6,  epApp:58, stf:521.00, oh:115.94, rate:RATE_REPL },
      { disp:"Replace (New App Med)",  apps:5,  epApp:50, stf:374.28, oh:83.29,  rate:RATE_REPL },
    ], plat:{ total_days:308, total_cost:0.2166, tracks:[
      { name:"Kafka / JMS",          apps:2, days:102, cost:0.0258 },
      { name:"MuleSoft API Integ.",  apps:1, days:41,  cost:0.0327 },
      { name:"DevOps - Jenkins/GHA", apps:5, days:115, cost:0.0830 },
      { name:"PCF - OpenShift",      apps:0, days:10,  cost:0.0000 },
    ]}},
    { label:"Complex Big Rock", apps:1, rows:[
      { disp:"Complex Big Rock", apps:1, epApp:135, stf:202.11, oh:44.98, rate:RATE_CBR },
    ], plat:{ total_days:76, total_cost:0.0534, tracks:[
      { name:"Kafka / JMS", apps:0, days:17, cost:0.0000 },
    ]}},
  ]},
  { name:"Operations", apps:182, groups:[
    { label:"R&R + Clone", apps:182, rows:[
      { disp:"R&R - Standard",         apps:181, epApp:24, stf:6503.48, oh:1447.30, rate:RATE_RNR },
      { disp:"Clone - Day 2 New Build", apps:1,   epApp:55, stf:82.34,   oh:18.32,   rate:RATE_RNR },
    ], plat:{ total_days:2417, total_cost:1.7014, tracks:[
      { name:"Kafka / JMS",          apps:35,  days:1073, cost:0.4515 },
      { name:"MuleSoft API Integ.",  apps:43,  days:2621, cost:1.4061 },
      { name:"DevOps - Jenkins/GHA", apps:166, days:1127, cost:2.7556 },
      { name:"PCF - OpenShift",      apps:60,  days:393,  cost:0.2670 },
    ]}},
  ]},
  { name:"Technology Platforms", apps:361, groups:[
    { label:"R&R + Clone", apps:263, rows:[
      { disp:"R&R - Standard",         apps:208, epApp:24, stf:7473.62, oh:1663.20, rate:RATE_RNR },
      { disp:"R&R - Low Effort",        apps:2,   epApp:18, stf:53.90,   oh:11.99,   rate:RATE_RNR },
      { disp:"Clone - Medium",          apps:39,  epApp:41, stf:2393.89, oh:532.74,  rate:RATE_RNR },
      { disp:"Clone - Day 2 New Build", apps:14,  epApp:55, stf:1152.78, oh:256.54,  rate:RATE_RNR },
    ], plat:{ total_days:3492, total_cost:2.4586, tracks:[
      { name:"Kafka / JMS",          apps:17,  days:715, cost:0.2193 },
      { name:"MuleSoft API Integ.",  apps:8,   days:328, cost:0.2616 },
      { name:"DevOps - Jenkins/GHA", apps:124, days:745, cost:2.0584 },
      { name:"PCF - OpenShift",      apps:16,  days:100, cost:0.0712 },
    ]}},
    { label:"Replace", apps:91, rows:[
      { disp:"Replace (New Platform)", apps:46, epApp:68, stf:4682.99, oh:1042.17, rate:RATE_REPL },
      { disp:"Replace (New App-High)", apps:10, epApp:58, stf:868.33,  oh:193.24,  rate:RATE_REPL },
      { disp:"Replace (New App Med)",  apps:35, epApp:50, stf:2619.96, oh:583.05,  rate:RATE_REPL },
    ], plat:{ total_days:2545, total_cost:1.7916, tracks:[
      { name:"Kafka / JMS",          apps:11, days:443, cost:0.1419 },
      { name:"MuleSoft API Integ.",  apps:4,  days:82,  cost:0.1308 },
      { name:"DevOps - Jenkins/GHA", apps:27, days:516, cost:0.4482 },
      { name:"PCF - OpenShift",      apps:11, days:58,  cost:0.0490 },
    ]}},
    { label:"Complex Big Rock", apps:7, rows:[
      { disp:"Complex Big Rock", apps:7, epApp:135, stf:1414.78, oh:314.85, rate:RATE_CBR },
    ], plat:{ total_days:531, total_cost:0.3735, tracks:[
      { name:"Kafka / JMS",          apps:5, days:85, cost:0.0645 },
      { name:"MuleSoft API Integ.",  apps:2, days:82, cost:0.0654 },
      { name:"DevOps - Jenkins/GHA", apps:4, days:76, cost:0.0664 },
    ]}},
  ]},
  { name:"Back Office", apps:129, groups:[
    { label:"R&R + Clone", apps:128, rows:[
      { disp:"R&R - Standard",         apps:113, epApp:24, stf:4060.19, oh:903.57,  rate:RATE_RNR },
      { disp:"Clone - Medium",          apps:8,   epApp:41, stf:491.06,  oh:109.28,  rate:RATE_RNR },
      { disp:"Clone - Day 2 New Build", apps:2,   epApp:55, stf:164.68,  oh:36.65,   rate:RATE_RNR },
      { disp:"Third Party Drivers",     apps:5,   epApp:24, stf:179.65,  oh:39.98,   rate:RATE_RNR },
    ], plat:{ total_days:1700, total_cost:1.1966, tracks:[
      { name:"Kafka / JMS",          apps:18, days:494, cost:0.2322 },
      { name:"MuleSoft API Integ.",  apps:2,  days:82,  cost:0.0654 },
      { name:"DevOps - Jenkins/GHA", apps:51, days:535, cost:0.8466 },
      { name:"PCF - OpenShift",      apps:16, days:42,  cost:0.0712 },
    ]}},
    { label:"Replace", apps:1, rows:[
      { disp:"Replace (New App-High)", apps:1, epApp:58, stf:86.83, oh:19.32, rate:RATE_REPL, note:"Delivered by third party · coordination included" },
    ], plat:{ total_days:28, total_cost:0.0197, tracks:[
      { name:"Kafka / JMS",          apps:1, days:17, cost:0.0129 },
      { name:"DevOps - Jenkins/GHA", apps:1, days:19, cost:0.0166 },
    ]}},
  ]},
];

// ── CUSTOM SOLUTIONS ──────────────────────────────────────────────────────────
export const CUSTOM_SOLUTIONS = [
  { name:"Security",      days:18679, cost:33.347, note:"1,036 security-flagged apps" },
  { name:"ServiceNow",    days:7940,  cost:14.176, note:"Separate ServiceNow tower" },
  { name:"Observability", days:4335,  cost:7.739,  note:"Programme-wide" },
  { name:"EUC",           days:1032,  cost:1.842,  note:"5 EUC apps" },
  { name:"COLO Build",    days:2143,  cost:3.826,  note:"WTC25 colo infrastructure" },
];

// ── STAFFING — sample data (20 anonymised records). Upload your file to see live data. ───
export const STAFFING = {
  total: 20, named: 16, us: 5, india: 13, argentina: 2,
  months: 16, daysPerPerson: 320, totalDays: 6400,
  pods: [
    { name:"Migration Pod 1", people:4, us:1, india:3, ar:0, group:"App Migration", totalDays:1280 },
    { name:"Migration Pod 2", people:4, us:0, india:3, ar:1, group:"App Migration", totalDays:1280 },
    { name:"Data Pod",        people:7, us:1, india:5, ar:1, group:"Data Platform",     totalDays:2240 },
    { name:"Program Team",    people:5, us:3, india:2, ar:0, group:"Program Leadership", totalDays:1600 },
  ],
  levels: [
    { band:"6-Senior Manager",       people:2,  bill:70, us:1, india:1, ar:0, totalDays:640  },
    { band:"7-Manager",              people:6,  bill:62, us:4, india:0, ar:2, totalDays:1920 },
    { band:"8-Associate Manager",    people:5,  bill:56, us:0, india:5, ar:0, totalDays:1600 },
    { band:"9-Team Lead/Consultant", people:5,  bill:52, us:0, india:5, ar:0, totalDays:1600 },
    { band:"10-Senior Analyst",      people:2,  bill:37, us:0, india:2, ar:0, totalDays:640  },
  ],
  groups: [
    { name:"App Migration",      people:8, us:1, india:6, ar:1, totalDays:2560 },
    { name:"Data Platform",      people:7, us:1, india:5, ar:1, totalDays:2240 },
    { name:"Program Leadership", people:5, us:3, india:2, ar:0, totalDays:1600 },
  ],
  byGroupLevel: {
    "App Migration": [
      { band:"7-Manager",              people:2, us:1, india:0, ar:1, totalDays:640 },
      { band:"8-Associate Manager",    people:2, us:0, india:2, ar:0, totalDays:640 },
      { band:"9-Team Lead/Consultant", people:3, us:0, india:3, ar:0, totalDays:960 },
      { band:"10-Senior Analyst",      people:1, us:0, india:1, ar:0, totalDays:320 },
    ],
    "Data Platform": [
      { band:"7-Manager",              people:2, us:1, india:0, ar:1, totalDays:640 },
      { band:"8-Associate Manager",    people:2, us:0, india:2, ar:0, totalDays:640 },
      { band:"9-Team Lead/Consultant", people:2, us:0, india:2, ar:0, totalDays:640 },
      { band:"10-Senior Analyst",      people:1, us:0, india:1, ar:0, totalDays:320 },
    ],
    "Program Leadership": [
      { band:"6-Senior Manager",    people:2, us:1, india:1, ar:0, totalDays:640 },
      { band:"7-Manager",           people:2, us:2, india:0, ar:0, totalDays:640 },
      { band:"8-Associate Manager", people:1, us:0, india:1, ar:0, totalDays:320 },
    ],
  },

};

// Cost Model Initiatives — sourced from "Initiative Pricing" sheet of FXF_Cost_Per_EAI_Model_V5.xlsx
// All monetary values in $K (thousands). rawTotal = base + oh + platTotal.
export const INITIATIVES = [
  { name: "Commercial - Clone",                    portfolio: "Commercial",                           apps:   1, base:  87.776, oh:   42.005, platTotal:     0,        rawTotal:   129.781, recon:   138.042 },
  { name: "Commercial - Day 2 EAIs",               portfolio: "Commercial",                           apps:  10, base:  1111.117, oh:  531.720, platTotal:   6.449,  rawTotal:  1649.286, recon:  1754.274 },
  { name: "Commercial - Remediate & Retain",       portfolio: "Commercial",                           apps: 230, base: 11766.277, oh: 5630.695, platTotal: 1787.555, rawTotal: 19184.527, recon: 20405.760 },
  { name: "New Build - CDAS Replacement",          portfolio: "Commercial",                           apps:   1, base:   51.381, oh:   24.588, platTotal:  10.511,  rawTotal:    86.480, recon:    91.985 },
  { name: "New Build - Café/FSM",                  portfolio: "Commercial",                           apps:   5, base:  660.798, oh:  297.107, platTotal:   6.449,  rawTotal:   964.354, recon:  1025.742 },
  { name: "New Build - Clearance / Descartes",     portfolio: "Commercial",                           apps:   5, base:  256.906, oh:  122.941, platTotal:     0,        rawTotal:   379.847, recon:   404.027 },
  { name: "New Build - Custom Critical TMS",       portfolio: "Commercial",                           apps:   4, base:  205.524, oh:   98.353, platTotal:     0,        rawTotal:   303.877, recon:   323.221 },
  { name: "New Build - Customer Automation",       portfolio: "Commercial",                           apps:   5, base:  587.883, oh:  264.323, platTotal:  61.128,  rawTotal:   913.334, recon:   971.474 },
  { name: "New Build - Messaging",                 portfolio: "Commercial, Technology Platforms",     apps:   4, base: 1501.281, oh:  553.234, platTotal:  54.940,  rawTotal:  2109.455, recon:  2166.510 },
  { name: "New Build - Pega Replacements",         portfolio: "Commercial",                           apps:   1, base:  113.931, oh:   51.225, platTotal:     0,        rawTotal:   165.156, recon:   175.670 },
  { name: "Operations - Day 2 EAIs",               portfolio: "Operations",                           apps:   1, base:  117.748, oh:   56.348, platTotal:     0,        rawTotal:   174.096, recon:   198.153 },
  { name: "Operations - Remediate & Retain",       portfolio: "Operations",                           apps: 181, base:  9299.983, oh: 4450.462, platTotal: 2007.083, rawTotal: 15757.528, recon: 17934.947 },
  { name: "Big Rock - FXNet",                      portfolio: "Technology Platforms",                 apps:   1, base:  375.320, oh:  138.309, platTotal:  16.959,  rawTotal:   530.588, recon:   538.517 },
  { name: "Big Rock - Security Operational Analytics", portfolio: "Technology Platforms",             apps:   1, base:  375.320, oh:  138.309, platTotal:   6.449,  rawTotal:   520.078, recon:   527.849 },
  { name: "Data - Day 2 EAIs",                     portfolio: "Technology Platforms",                 apps:   7, base:  764.294, oh:  365.749, platTotal:     0,        rawTotal:  1130.043, recon:  1146.930 },
  { name: "Data - Remediate & Retain",             portfolio: "Technology Platforms",                 apps: 117, base:  5998.746, oh: 2870.671, platTotal: 269.245,  rawTotal:  9138.662, recon:  9275.221 },
  { name: "EUC - Day 2 EAIs",                      portfolio: "Technology Platforms",                 apps:   2, base:  175.552, oh:   84.010, platTotal:     0,        rawTotal:   259.562, recon:   263.440 },
  { name: "EUC - Remediate & Retain",              portfolio: "Technology Platforms",                 apps:  14, base:  719.336, oh:  344.235, platTotal:     0,        rawTotal:  1063.571, recon:  1079.463 },
  { name: "New Build - API Mgmt",                  portfolio: "Technology Platforms",                 apps:   2, base:  750.640, oh:  276.617, platTotal:  49.646,  rawTotal:  1076.903, recon:  1092.996 },
  { name: "New Build - Address EFS",               portfolio: "Technology Platforms",                 apps:   9, base: 1025.377, oh:  461.029, platTotal: 104.143,  rawTotal:  1590.549, recon:  1614.316 },
  { name: "New Build - Development Tools",         portfolio: "Technology Platforms",                 apps:   4, base:  528.639, oh:  237.686, platTotal:  16.086,  rawTotal:   782.411, recon:   794.102 },
  { name: "New Build - ENS-NDS",                   portfolio: "Technology Platforms",                 apps:   2, base:  309.892, oh:  139.333, platTotal:  16.959,  rawTotal:   466.184, recon:   473.150 },
  { name: "New Build - Field Services Network",    portfolio: "Technology Platforms",                 apps:   2, base:  268.877, oh:  120.892, platTotal:   3.189,  rawTotal:   392.958, recon:   398.830 },
  { name: "New Build - GRC",                       portfolio: "Technology Platforms, Back Office",    apps:   1, base:   51.381, oh:   24.588, platTotal:     0,        rawTotal:    75.969, recon:    78.213 },
  { name: "New Build - Greenfield Infrastructure", portfolio: "Technology Platforms",                 apps:  22, base: 2911.330, oh: 1312.395, platTotal:  90.943,  rawTotal:  4314.668, recon:  4379.142 },
  { name: "New Build - Greenfield Network",        portfolio: "Technology Platforms",                 apps:  39, base: 5833.254, oh: 2622.740, platTotal:  75.300,  rawTotal:  8531.294, recon:  8658.778 },
  { name: "New Build - Security",                  portfolio: "Technology Platforms",                 apps:   4, base:  268.074, oh:  124.990, platTotal:     0,        rawTotal:   393.064, recon:   398.938 },
  { name: "New Build - ServiceNow",                portfolio: "Technology Platforms",                 apps:   1, base:  113.931, oh:   51.225, platTotal:     0,        rawTotal:   165.156, recon:   167.624 },
  { name: "New Build - Telephony",                 portfolio: "Technology Platforms",                 apps:  12, base: 1449.199, oh:  651.587, platTotal:     0,        rawTotal:  2100.786, recon:  2132.178 },
  { name: "Security - Clone",                      portfolio: "Technology Platforms",                 apps:   3, base:  263.328, oh:  126.014, platTotal:   6.449,  rawTotal:   395.791, recon:   401.706 },
  { name: "Security - Day 2 EAIs",                 portfolio: "Technology Platforms",                 apps:  12, base: 1113.258, oh:  532.744, platTotal:     0,        rawTotal:  1646.002, recon:  1670.598 },
  { name: "Security - Remediate & Retain",         portfolio: "Technology Platforms",                 apps:  30, base: 1541.434, oh:  737.646, platTotal:  47.358,  rawTotal:  2326.438, recon:  2361.201 },
  { name: "Tech Platforms - Clone",                portfolio: "Technology Platforms",                 apps:  18, base: 1579.970, oh:  756.087, platTotal: 153.176,  rawTotal:  2489.233, recon:  2526.429 },
  { name: "Tech Platforms - Day 2 EAIs",           portfolio: "Technology Platforms",                 apps:  10, base: 1057.595, oh:  506.107, platTotal:     0,        rawTotal:  1563.702, recon:  1587.068 },
  { name: "Tech Platforms - Remediate & Retain",   portfolio: "Technology Platforms",                 apps:  48, base: 2453.449, oh: 1174.086, platTotal: 171.318,  rawTotal:  3798.853, recon:  3855.619 },
  { name: "Back Office - Clone",                   portfolio: "Back Office",                          apps:   7, base:  614.433, oh:  294.034, platTotal: 108.134,  rawTotal:  1016.601, recon:  1046.623 },
  { name: "Back Office - Day 2 EAIs",              portfolio: "Back Office",                          apps:   3, base:  323.273, oh:  154.701, platTotal:     0,        rawTotal:   477.974, recon:   492.089 },
  { name: "Back Office - Remediate & Retain",      portfolio: "Back Office",                          apps: 119, base: 6114.354, oh: 2925.994, platTotal: 362.292,  rawTotal:  9402.640, recon:  9680.323 },
  { name: "New Build - Contract Management",       portfolio: "Back Office",                          apps:   1, base:   51.381, oh:   24.588, platTotal:   6.449,  rawTotal:    82.418, recon:    84.852 },
];
