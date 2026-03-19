// ============================================================
// LEDGERAI — RULES ENGINE EXTENDED v1.0
// 300+ patterns: Canadian-first, US, UK, AU
// Industries: Retail, SaaS, Agency, Construction, Healthcare
// Load AFTER app.js — extends RULES_ENGINE array
// ============================================================

(function() {
'use strict';

// Additional rules to merge into the main RULES_ENGINE
const EXTENDED_RULES = [

  // ── PAYROLL & HR (EXPANDED) ─────────────────────────────────
  { pattern: /PAYWORKS|PEOPLE\s*SOFT|BAMBOO\s*HR|RIPPLING|DAYFORCE|KRONOS|PAYCOM|WORKDAY\s*PAY/i, category: 'Payroll', flag: 'none' },
  { pattern: /EMPLOYEE\s*DIRECT\s*DEP|PAYROLL\s*DIRECT|DIRECT\s*PAY\s*EMP/i, category: 'Payroll', flag: 'none' },
  { pattern: /WORKERS\s*COMP|WSIB|WCB\s*PREMIUM|WORKPLACE\s*SAFETY/i, category: 'Payroll Tax', flag: 'Workers compensation premium — review for correct allocation period' },
  { pattern: /ROE\s*SUBMISSION|RECORD\s*OF\s*EMPLOYMENT|EI\s*PREMIUM|CPP\s*CONTRIBUTION/i, category: 'Payroll Tax', flag: 'none' },
  { pattern: /GROUP\s*BENEFITS|MANULIFE\s*GROUP|SUNLIFE\s*BENEFITS|GREAT\s*WEST\s*LIFE|EMPIRE\s*LIFE|DESJARDINS\s*INS/i, category: 'Employee Benefits & Recognition', flag: 'Employee group benefits — confirm employer vs employee portion split for accurate P&L' },
  { pattern: /RRSP\s*MATCH|PENSION\s*CONTRIBUT|DPSP\s*CONTRIBUT|DEFINED\s*BENEFIT/i, category: 'Employee Benefits & Recognition', flag: 'Retirement plan contribution — employer match is deductible; verify plan registration' },
  { pattern: /HEALTH\s*SPENDING\s*ACCOUNT|HSA\s*CONTRIBUT|PARAMEDICAL|DENTAL\s*CLAIM|VISION\s*CLAIM/i, category: 'Employee Benefits & Recognition', flag: 'Health benefit claim — deductible if through registered HSA plan' },
  { pattern: /SIGNING\s*BONUS|HIRING\s*BONUS|RETENTION\s*BONUS/i, category: 'Payroll', flag: '⚠ Signing/retention bonus — verify payroll tax treatment and vesting schedule' },

  // ── PROFESSIONAL SERVICES (EXPANDED) ────────────────────────
  { pattern: /KPMG|DELOITTE|PWC|PRICEWATERHOUSE|ERNST\s*&?\s*YOUNG|EY\s+LLP|GRANT\s*THORNTON|MNP\s+LLP|BDO\s+CANADA|RSM/i, category: 'Legal & Professional Fees', flag: 'Big 4 / National firm fee — confirm if audit, tax, or advisory for correct classification' },
  { pattern: /CONSULTING\s*FEE|MANAGEMENT\s*CONSULT|STRATEGY\s*CONSULT|ADVISORY\s*SERV/i, category: 'Legal & Professional Fees', flag: 'Consulting fee — verify if capital advisory (capitalize) or operational (expense)' },
  { pattern: /NOTARY\s*PUBLIC|TITLE\s*INSURANCE|LAND\s*TRANSFER|CLOSING\s*COSTS/i, category: 'Legal & Professional Fees', flag: 'Real estate closing cost — typically capitalized as part of asset cost, not expensed' },
  { pattern: /PATENT\s*FILING|TRADEMARK\s*REG|COPYRIGHT\s*REG|IP\s*LEGAL|INTELLECTUAL\s*PROP/i, category: 'Legal & Professional Fees', flag: 'IP legal fees — may be capitalizable as intangible asset; consult accountant' },
  { pattern: /MEDIATI|ARBITRATI|TRIBUNAL\s*FEE|COURT\s*FILING/i, category: 'Legal & Professional Fees', flag: '⚠ Dispute resolution cost — determine if deductible or capital; document outcome' },
  { pattern: /BOOKKEEPING\s*SERV|ACCOUNTING\s*SERV|TAX\s*PREP|T2\s*FILING|T1\s*FILING|CRA\s*REPRESENT/i, category: 'Legal & Professional Fees', flag: 'Accounting/tax service — deductible professional fee' },
  { pattern: /RECRUITMENT\s*FEE|HEADHUNTER|EXECUTIVE\s*SEARCH|STAFFING\s*AGENC|TEMP\s*AGENC/i, category: 'Contractor / Professional Services', flag: 'Recruitment/staffing fee — deductible; if temp agency workers may be contractors — T4A threshold applies' },
  { pattern: /SECURITY\s*GUARD|ARMOUR(ED)?\s*TRANSIT|BRINKS|G4S\s*SECURE|SECURITAS/i, category: 'Contractor / Professional Services', flag: 'Security contractor — T4A/1099 may apply if individual; verify employment vs. contractor status' },
  { pattern: /CLEANING\s*SERV|JANITORIAL|HOUSEKEEP\s*SERV|MAID\s*SERV/i, category: 'Contractor / Professional Services', flag: 'Cleaning service — T4A if paid to individual over $500; verify contractor vs employee' },
  { pattern: /PHOTOGRAPHY\s*SERV|VIDEOGRAPH|FILMMAKER|PHOTO\s*SHOOT|CONTENT\s*CREAT/i, category: 'Contractor / Professional Services', flag: 'Creative contractor — T4A/1099-NEC if annual payments ≥ threshold; retain invoices' },
  { pattern: /TRANSLATION\s*SERV|INTERPRETER|LOCALIZATI/i, category: 'Contractor / Professional Services', flag: 'Translation service — contractor payment; T4A if individual' },

  // ── SOFTWARE & SAAS (EXPANDED — 100+ platforms) ─────────────
  { pattern: /INTERCOM|ZENDESK|FRESHDESK|HELP\s*SCOUT|GORGIAS|RE:AMAZE|FRONT\s*APP/i, category: 'Software & Subscriptions', flag: 'none' },
  { pattern: /PIPEDRIVE|ZOHO\s*CRM|COPPER\s*CRM|CLOSE\.IO|NUTSHELL|STREAK|AGILE\s*CRM/i, category: 'Software & Subscriptions', flag: 'none' },
  { pattern: /STRIPE\b(?!\s*FEES?)/i, category: 'Software & Subscriptions', flag: 'none' },
  { pattern: /SEGMENT\b|MIXPANEL|HEAP\s*ANALYTICS|PENDO|FULLSTORY|HOTJAR|MOUSEFLOW|CRAZY\s*EGG/i, category: 'Software & Subscriptions', flag: 'none' },
  { pattern: /DATADOG|NEW\s*RELIC|DYNATRACE|SPLUNK|SUMO\s*LOGIC|ELASTIC\b|KIBANA/i, category: 'Software & Subscriptions', flag: 'none' },
  { pattern: /SENDGRID|MAILGUN|POSTMARK|SPARKPOST|TWILIO|VONAGE\b|PLIVO/i, category: 'Software & Subscriptions', flag: 'none' },
  { pattern: /GITHUB\s*(ENT|TEAM|ORG)|GITLAB\s*(PREMIUM|ULTIMATE)|BITBUCKET/i, category: 'Software & Subscriptions', flag: 'none' },
  { pattern: /DOCKER\s*(DESKTOP|HUB)|KUBERNETES|RANCHER|OPENSHIFT/i, category: 'Software & Subscriptions', flag: 'none' },
  { pattern: /SNOWFLAKE\b|DATABRICKS|DBT\s*CLOUD|FIVETRAN|STITCH\s*DATA|AIRBYTE/i, category: 'Software & Subscriptions', flag: 'none' },
  { pattern: /AIRTABLE|CLICKUP|LINEAR\b|SHORTCUT\b|BASECAMP|TEAMWORK\s*PM/i, category: 'Software & Subscriptions', flag: 'none' },
  { pattern: /MIRO\b|MURAL\b|WHIMSICAL\b|LUCIDCHART|DRAW\.IO|BALSAMIQ/i, category: 'Software & Subscriptions', flag: 'none' },
  { pattern: /LOOM\b|VIDYARD|WISTIA|VIMEO\s*(PRO|BUSINESS)|BRIGHTCOVE/i, category: 'Software & Subscriptions', flag: 'none' },
  { pattern: /DOCUSIGN|HELLOSIGN|PANDADOC|SIGNWELL|SIGNNOW|BOLDSIGN/i, category: 'Software & Subscriptions', flag: 'none' },
  { pattern: /XERO\b|SAGE\s*(300|50|INTACCT)|QUICKBOOKS\s*(ONLINE|DESKTOP)|FRESHBOOKS|WAVE\s*ACCOUNT/i, category: 'Software & Subscriptions', flag: 'Accounting software subscription — deductible operational expense' },
  { pattern: /GUSTO\b|BAMBOO\s*HR|LATTICE\b|WORKDAY\b|PERSONIO|RIPPLING\b/i, category: 'Software & Subscriptions', flag: 'none' },
  { pattern: /TYPEFORM|SURVEYMONKEY|QUALTRICS|JOTFORM|GOOGLE\s*FORMS\s*PRO/i, category: 'Software & Subscriptions', flag: 'none' },
  { pattern: /CALENDLY|ACUITY\s*SCHED|DOODLE\s*PREM|HUBSPOT\s*MEET|MICROSOFT\s*BOOK/i, category: 'Software & Subscriptions', flag: 'none' },
  { pattern: /LASTPASS|1PASSWORD|BITWARDEN\s*TEAM|DASHLANE\s*BUSINESS|KEEPER\s*SECURITY/i, category: 'Software & Subscriptions', flag: 'none' },
  { pattern: /CROWDSTRIKE|SENTINEL\s*ONE|CARBON\s*BLACK|CYLANCE|DARKTRACE|QUALYS\b/i, category: 'Software & Subscriptions', flag: 'Cybersecurity subscription — deductible; document as required by cyber insurance policy' },
  { pattern: /GRAMMARLY\s*BUS|TEXTBROKER|CLEARSCOPE|SURFER\s*SEO|SCREAMING\s*FROG/i, category: 'Software & Subscriptions', flag: 'none' },
  { pattern: /SHOPIFY\s*PLUS|BIGCOMMERCE|MAGENTO|PRESTASHOP|WIX\s*(BUS|ENT)|SQUARESPACE\s*(BUS|COM)/i, category: 'Software & Subscriptions', flag: 'E-commerce platform subscription — deductible' },
  { pattern: /TWITCH\s*SUB|YOUTUBE\s*MEMBER|PATREON|SUBSTACK/i, category: 'Software & Subscriptions', flag: 'Content platform fee — verify business vs personal use before claiming deduction' },
  { pattern: /COURSERA\s*(BUS|TEAM)|UDEMY\s*BUS|LINKEDIN\s*LEARN|PLURALSIGHT|SAFARI\s*BOOKS|O'REILLY/i, category: 'Training & Education', flag: 'Online training subscription — deductible if for business skill development' },

  // ── ADVERTISING & MARKETING (EXPANDED) ──────────────────────
  { pattern: /CRITEO|OUTBRAIN|TABOOLA|SHARETHROUGH|DISTRICT\s*M/i, category: 'Advertising & Marketing', flag: 'none' },
  { pattern: /INFLUENCER\s*PAY|CREATOR\s*PAY|SPONSORED\s*POST|BRAND\s*DEAL/i, category: 'Advertising & Marketing', flag: 'Influencer/creator payment — T4A/1099-NEC if individual, retain contract and deliverables' },
  { pattern: /BILLBOARD\s*RENT|OUT\s*OF\s*HOME|OOH\s*ADVERTIS|TRANSIT\s*AD|TRANSIT\s*SHELTER/i, category: 'Advertising & Marketing', flag: 'none' },
  { pattern: /RADIO\s*AD|TV\s*COMMERCIAL|BROADCAST\s*AD|CTV\s*ADVERTIS|GLOBAL\s*NEWS\s*AD/i, category: 'Advertising & Marketing', flag: 'Traditional media buy — retain insertion order and affidavit of performance' },
  { pattern: /TRADE\s*SHOW|BOOTH\s*RENTAL|CONFERENCE\s*SPONSOR|EXPO\s*FEE|EXHIBIT\s*HALL/i, category: 'Advertising & Marketing', flag: 'Trade show expense — retain receipts; booth costs deductible, hospitality portion 50%' },
  { pattern: /PRINT\s*DESIGN|BROCHURE\s*PRINT|BUSINESS\s*CARD|FLYER\s*PRINT|BANNER\s*PRINT/i, category: 'Advertising & Marketing', flag: 'none' },
  { pattern: /PRODUCT\s*PHOTO|E\-?COMM\s*PHOTO|LIFESTYLE\s*SHOOT|BRAND\s*PHOTO/i, category: 'Advertising & Marketing', flag: 'Product photography — deductible marketing cost' },
  { pattern: /APP\s*STORE\s*FEE|GOOGLE\s*PLAY\s*FEE|APPLE\s*DEV\s*PROG|APP\s*SUBMISSION/i, category: 'Advertising & Marketing', flag: 'App store fee — deductible if related to business product distribution' },
  { pattern: /SOCIAL\s*MEDIA\s*TOOL|BUFFER\s*APP|HOOTSUITE|SPROUT\s*SOCIAL|LATER\s*APP|PLANOLY/i, category: 'Advertising & Marketing', flag: 'none' },
  { pattern: /SEO\s*SERV|ORGANIC\s*SEARCH|LINK\s*BUILD|GUEST\s*POST|DOMAIN\s*AUTHORITY/i, category: 'Advertising & Marketing', flag: 'SEO service — contractor payment if individual; T4A threshold applies' },

  // ── CLOUD & INFRASTRUCTURE (EXPANDED) ───────────────────────
  { pattern: /AMAZON\s*WEB\s*SERVICES|AWS\s*(BILL|INVOICE|USAGE)|AMAZON\s*EC2|AMAZON\s*S3|AMAZON\s*RDS/i, category: 'Utilities & Hosting', flag: 'none' },
  { pattern: /GOOGLE\s*CLOUD\s*(BILL|USAGE|PLATFORM)|GCP\s*(BILL|USAGE)|FIREBASE\s*BILL/i, category: 'Utilities & Hosting', flag: 'none' },
  { pattern: /MICROSOFT\s*AZURE|AZURE\s*(USAGE|BILL|SUBSCRIPT)/i, category: 'Utilities & Hosting', flag: 'none' },
  { pattern: /CLOUDFLARE\s*(PRO|BUS|ENT)|FASTLY\b|AKAMAI|CLOUDFRONT/i, category: 'Utilities & Hosting', flag: 'none' },
  { pattern: /LINODE\b|VULTR\b|OVH\b|HETZNER\b|SCALEWAY/i, category: 'Utilities & Hosting', flag: 'none' },
  { pattern: /MONGODB\s*ATLAS|REDIS\s*ENTERPRISE|ELASTIC\s*CLOUD|PLANETSCALE|NEON\s*DB/i, category: 'Utilities & Hosting', flag: 'none' },
  { pattern: /CDN\s*USAGE|BANDWIDTH\s*CHARGE|DATA\s*TRANSFER\s*FEE|EGRESS\s*CHARGE/i, category: 'Utilities & Hosting', flag: 'Cloud bandwidth charge — review if unusually high; may indicate misconfiguration' },
  { pattern: /DOMAIN\s*(REG|RENEWAL|TRANSFER)|NAMECHEAP|GODADDY|GOOGLE\s*DOMAINS|HOVER\s*DOMAIN|GANDI\b/i, category: 'Utilities & Hosting', flag: 'Domain registration — deductible; multi-year registrations may need proration' },
  { pattern: /SSL\s*CERT|TLS\s*CERT|CODE\s*SIGNING\s*CERT/i, category: 'Utilities & Hosting', flag: 'none' },

  // ── TRAVEL (EXPANDED — Canadian focus) ──────────────────────
  { pattern: /AIR\s*TRANSAT|SUNWING|SWOOP\s*AIRLINE|FLAIR\s*AIR|PAL\s*AIRLINES/i, category: 'Travel & Transportation', flag: 'none' },
  { pattern: /ENTERPRISE\s*RENT|BUDGET\s*RENT|AVIS\s*RENT|HERTZ\s*RENT|NATIONAL\s*CAR|DOLLAR\s*RENT|THRIFTY\s*CAR/i, category: 'Travel & Transportation', flag: 'Vehicle rental — business use required; log if mixed personal/business' },
  { pattern: /PARKING\s*(FEE|GARAGE|LOT|METER)|IMPARK|GREEN\s*P\s*PARK|INDIGO\s*PARK|SP\s*\+\s*PARK/i, category: 'Travel & Transportation', flag: 'none' },
  { pattern: /407\s*ETR|407\s*TOLL|HWY\s*407|TOLL\s*ROAD|E\-?ZPASS/i, category: 'Travel & Transportation', flag: 'none' },
  { pattern: /MILEAGE\s*CLAIM|KM\s*ALLOWANCE|AUTOMOBILE\s*ALLOW|VEHICLE\s*REIMB/i, category: 'Travel & Transportation', flag: 'Mileage/vehicle allowance — verify CRA/IRS standard rate used; retain log' },
  { pattern: /AIRBNB\b|VRBO\b|VACATION\s*RENTAL|SHORT\s*TERM\s*RENTAL/i, category: 'Travel & Transportation', flag: 'Short-term rental — verify if business travel; retain itinerary and business purpose' },
  { pattern: /TRIPADVISOR\s*HOTEL|HOTELS\.COM|EXPEDIA\s*(HOTEL|FLIGHT)|BOOKING\.COM|PRICELINE\s*HOTEL/i, category: 'Travel & Transportation', flag: 'Online travel booking — retain confirmation and business purpose documentation' },
  { pattern: /TRAVEL\s*INSURANCE|TRIP\s*PROTECT|BLUE\s*CROSS\s*TRAVEL|MANULIFE\s*TRAVEL/i, category: 'Insurance', flag: 'Travel insurance — deductible if for business travel; pro-rate personal portion' },
  { pattern: /BIKE\s*SHARE|BIKESHARE|LIME\s*SCOOTER|BIRD\s*SCOOTER|LINK\s*SCOOTER/i, category: 'Travel & Transportation', flag: 'Micro-mobility — minor transportation expense; retain if claiming commute deduction' },

  // ── MEALS & ENTERTAINMENT (EXPANDED) ────────────────────────
  { pattern: /MONTANAS\b|JACK\s*ASTOR|MILESTONES\s*GRILL|EARLS\s*KITCHEN|CACTUS\s*CLUB|JOEY\s*RESTAURANT/i, category: 'Meals & Entertainment', flag: 'Meals & entertainment — only 50% deductible per CRA. Retain receipt; note attendees and business purpose.' },
  { pattern: /THE\s*KEG\b|RUTH'?S\s*CHRIS|MORTONS\s*STEAK|CAPITAL\s*GRILL|FLEMINGS\s*PRIME/i, category: 'Meals & Entertainment', flag: 'Fine dining — 50% deductible; high-scrutiny item; ensure business purpose is documented' },
  { pattern: /DOOR\s*DASH|UBEREATS|SKIP\s*THE\s*DISHES|GRUBHUB|POSTMATES|INSTACART\s*FOOD/i, category: 'Meals & Entertainment', flag: 'Food delivery — 50% deductible if business meal; personal food delivery not deductible' },
  { pattern: /CONCERT\s*TICKET|SPORTS\s*TICKET|THEATRE\s*TICKET|OPERA\s*TICKET|BALLET\s*TICKET/i, category: 'Meals & Entertainment', flag: '50% entertainment deduction limit applies; retain ticket stub and document business purpose' },
  { pattern: /GOLF\s*(CLUB|ROUND|FEES?|COURSE)|COUNTRY\s*CLUB\s*DUES?|PRIVATE\s*CLUB|DINING\s*CLUB/i, category: 'Meals & Entertainment', flag: '⚠ Golf/club — CRA: 0% deductible for golf; IRS: entertainment generally not deductible post-TCJA' },
  { pattern: /MINI\s*BAR|ROOM\s*SERVICE|HOTEL\s*DINING/i, category: 'Meals & Entertainment', flag: 'Hotel room service/mini bar — meals 50% deductible; alcohol portion scrutinized by CRA' },
  { pattern: /GIFT\s*CARD\s*(PURCHASE|AMZN|VISA|MASTERCARD)|GIFT\s*CERTIFICATE\s*PURCHASE/i, category: 'Meals & Entertainment', flag: 'Gift card purchase — if for clients, 50% deductible; if for employees, taxable benefit over $500' },
  { pattern: /HOLIDAY\s*PARTY|CHRISTMAS\s*PARTY|COMPANY\s*PARTY|STAFF\s*EVENT/i, category: 'Meals & Entertainment', flag: 'Staff event — CRA: up to 6 events/year 100% deductible; over 6 = 50%; document attendees' },
  { pattern: /CATERING\s*ORDER|EVENT\s*CATERING|CORPORATE\s*CATERING/i, category: 'Meals & Entertainment', flag: 'Catering — 50% deductible for business meals; 100% for company events (up to CRA limit)' },

  // ── OFFICE SUPPLIES & EQUIPMENT (EXPANDED) ──────────────────
  { pattern: /APPLE\s*(STORE|ONLINE|COM)\b(?!.*(?:TV|MUSIC|ARCADE|ICLOUD))/i, category: 'Office Supplies & Equipment', flag: 'Apple device purchase — items >$500 may require CCA Class 10 capitalization; consult accountant' },
  { pattern: /DELL\s*(DIRECT|TECHNOL)|HP\s*(DIRECT|ONLINE)|LENOVO\s*(DIRECT|CANADA)|MICROSOFT\s*STORE(?!\s*365)/i, category: 'Office Supplies & Equipment', flag: 'Computer hardware — Class 10 or 55 (zero-emission) CCA; 100% CCA allowed in year of purchase for eligible property' },
  { pattern: /COSTCO\s*BUS|STAPLES\s*ADV|OFFICE\s*MAX|ULINE\b|W\.W\.\s*GRAINGER/i, category: 'Office Supplies & Equipment', flag: 'none' },
  { pattern: /PRINTER\s*CARTRIDGE|TONER\s*CARTRIDGE|INK\s*REFILL/i, category: 'Office Supplies & Equipment', flag: 'none' },
  { pattern: /POSTAGE\s*METER|PITNEY\s*BOWES|FRANCOTYP/i, category: 'Office Supplies & Equipment', flag: 'none' },
  { pattern: /CELL\s*PHONE\s*PURCHASE|MOBILE\s*DEVICE\s*PURCH|IPHONE\s*PURCH|SAMSUNG\s*GALAXY/i, category: 'Office Supplies & Equipment', flag: 'Mobile device — business use portion deductible; personal use must be segregated for CRA' },
  { pattern: /MONITOR\s*PURCHASE|DISPLAY\s*SCREEN|WEBCAM\s*PURCH|HEADSET\s*PURCH|KEYBOARD\s*MOUSE/i, category: 'Office Supplies & Equipment', flag: 'Peripherals — deductible if under $500; >$500 may require capitalization' },
  { pattern: /PHOTOCOPIER|MULTIFUNCTION\s*PRINTER|MFP\s*LEASE|XEROX\s*LEASE|RICOH\s*LEASE/i, category: 'Office Supplies & Equipment', flag: 'Equipment lease — operating lease = expense; verify not a finance/capital lease' },

  // ── UTILITIES (EXPANDED) ─────────────────────────────────────
  { pattern: /ALECTRA|HYDRO\s*ONE|TORONTO\s*HYDRO|OPG\s*BILL|FORTISBC|HYDRO\s*QUEBEC|NOVA\s*SCOTIA\s*POWER/i, category: 'Utilities & Hosting', flag: 'none' },
  { pattern: /ENBRIDGE\s*GAS|UNION\s*GAS|FORTIS\s*ALTA|ATCO\s*GAS|HERITAGE\s*GAS/i, category: 'Utilities & Hosting', flag: 'none' },
  { pattern: /WASTE\s*MANAGEMENT|WASTE\s*CONNECTIONS|BIN\s*PICK\s*UP|RECYCLING\s*SERV/i, category: 'Utilities & Hosting', flag: 'none' },
  { pattern: /WATER\s*BILL|MUNICIPAL\s*WATER|REGIONAL\s*WATER/i, category: 'Utilities & Hosting', flag: 'none' },
  { pattern: /SECURITY\s*MONITOR|ALARM\s*SYSTEM\s*(MAINT|SUB)|ADT\s*(CANADA|SECURITY)|BRINKS\s*HOME/i, category: 'Utilities & Hosting', flag: 'none' },
  { pattern: /FIRE\s*PROTECTION|SPRINKLER\s*INSPECT|FIRE\s*ALARM\s*MAINT/i, category: 'Utilities & Hosting', flag: 'none' },

  // ── BANKING & FINANCE (EXPANDED) ─────────────────────────────
  { pattern: /NSF\s*FEE|RETURNED\s*ITEM\s*FEE|INSUFFICIENT\s*FUNDS/i, category: 'Bank & Finance Charges', flag: '⚠ NSF/returned item fee — review cash flow management; recurring NSFs are a risk indicator' },
  { pattern: /OVERDRAFT\s*FEE|OD\s*INTEREST|LINE\s*OF\s*CREDIT\s*INT/i, category: 'Bank & Finance Charges', flag: 'Interest expense — deductible if borrowing used for business; document purpose of funds' },
  { pattern: /LOAN\s*INTEREST|MORTGAGE\s*INT(?!.*PRINCIPAL)|TERM\s*LOAN\s*INT|BUSINESS\s*LOAN\s*INT/i, category: 'Bank & Finance Charges', flag: 'Loan interest — deductible if business use; separate principal repayment (not deductible)' },
  { pattern: /CURRENCY\s*EXCHANGE|FX\s*CONVERSION|FOREIGN\s*EXCHANGE\s*FEE|WIRE\s*TRANSFER\s*FEE/i, category: 'Bank & Finance Charges', flag: 'FX/wire fee — deductible; note exchange rate for functional currency reporting' },
  { pattern: /ANNUAL\s*CARD\s*FEE|CREDIT\s*CARD\s*FEE|BUSINESS\s*CARD\s*FEE/i, category: 'Bank & Finance Charges', flag: 'Credit card annual fee — deductible if card used for business' },
  { pattern: /KLARNA|AFTERPAY|SEZZLE|PAYBRIGHT|FLEXITI/i, category: 'Bank & Finance Charges', flag: 'Buy-now-pay-later — record full amount as expense; future installments as AP or prepaid' },
  { pattern: /VENTURE\s*DEBT|REVENUE\s*FINANCE|CLEARCO|WAYFLYER|CAPCHASE/i, category: 'Bank & Finance Charges', flag: '⚠ Alternative financing — review terms; revenue-based repayments may not all be deductible interest' },
  { pattern: /R&D\s*TAX\s*CREDIT|CITS\s*REFUND|SR&ED\s*REFUND|ITC\s*REFUND/i, category: 'Income', flag: 'Government tax credit/refund — not income; reduces tax expense or R&D asset; consult accountant', onlyIfDeposit: true },
  { pattern: /GOVERNMENT\s*GRANT|IRAP\s*GRANT|CDAP\s*GRANT|BCTECH\s*FUND|NRCAN\s*FUND/i, category: 'Income', flag: 'Government grant — may be taxable income; verify conditions and recognition timing', onlyIfDeposit: true },

  // ── INSURANCE (EXPANDED) ─────────────────────────────────────
  { pattern: /COMMERCIAL\s*GENERAL\s*LIAB|CGL\s*INSURANCE|PUBLIC\s*LIABIL/i, category: 'Insurance', flag: 'Commercial liability insurance — fully deductible; retain certificate of insurance' },
  { pattern: /DIRECTORS\s*&?\s*OFFICERS|D&O\s*INSURANCE|MANAGEMENT\s*LIAB/i, category: 'Insurance', flag: 'D&O insurance — deductible; note limits and coverage period for working papers' },
  { pattern: /PROFESSIONAL\s*LIAB|ERRORS\s*&?\s*OMISSIONS|E&O\s*POLICY/i, category: 'Insurance', flag: 'E&O/professional liability — deductible; ensure coverage matches contracts with clients' },
  { pattern: /CYBER\s*(LIAB|RISK|INSURANCE|PROTECT)|DATA\s*BREACH\s*INS/i, category: 'Insurance', flag: 'Cyber insurance — deductible; review coverage limits annually given ransomware risk' },
  { pattern: /KEY\s*PERSON\s*INSURANCE|KEYMAN\s*INSURANCE|LIFE\s*INS.*BUSINESS|BUSINESS\s*LIFE\s*INS/i, category: 'Insurance', flag: '⚠ Key person life insurance — generally NOT deductible if company is beneficiary; consult accountant' },
  { pattern: /VEHICLE\s*INSURANCE|AUTO\s*INSURANCE|COMMERCIAL\s*AUTO/i, category: 'Insurance', flag: 'Vehicle insurance — deductible for business-use vehicles; pro-rate personal use portion' },
  { pattern: /PROPERTY\s*INSURANCE|COMMERCIAL\s*PROPERTY|TENANT\s*INSURANCE\s*COMMERCIAL/i, category: 'Insurance', flag: 'Property insurance — fully deductible; multi-year premium must be allocated to period' },
  { pattern: /PRODUCT\s*LIAB|PRODUCT\s*RECALL\s*INS|CARGO\s*INSURANCE/i, category: 'Insurance', flag: 'Product/cargo insurance — deductible; retain schedule of values for auditors' },

  // ── RENT & FACILITIES (EXPANDED) ─────────────────────────────
  { pattern: /BREATHER\b|DAVINCI\s*VIRTUAL|INTELLIGENT\s*OFFICE|SERVCORP|SALESFORCE\s*TOWER/i, category: 'Rent & Facilities', flag: 'none' },
  { pattern: /PROPERTY\s*TAX|REALTY\s*TAX|MUNICIPAL\s*TAX|BUSINESS\s*PROPERTY\s*TAX/i, category: 'Rent & Facilities', flag: 'Property tax — deductible if for business premises; document lease terms' },
  { pattern: /CONDO\s*FEE|STRATA\s*FEE|MAINTENANCE\s*FEE\s*(?:CONDO|STRATA)/i, category: 'Rent & Facilities', flag: 'Condo/strata fee — deductible if office premises; home office rules apply if residential' },
  { pattern: /HVAC\s*(MAINT|REPAIR|SERVICE)|FURNACE\s*(SERVICE|MAINT)|AC\s*REPAIR/i, category: 'Rent & Facilities', flag: 'HVAC service — current repair is expense; major replacement may be capital' },
  { pattern: /ELEVATOR\s*(MAINT|INSPECT|SERVICE)|ESCALATOR\s*SERVICE/i, category: 'Rent & Facilities', flag: 'none' },
  { pattern: /STORAGE\s*(UNIT|LOCKER|FACILIT)|PUBLIC\s*STORAGE|U-HAUL\s*STORAGE|IRON\s*MOUNTAIN/i, category: 'Rent & Facilities', flag: 'none' },
  { pattern: /MOVING\s*COMPANY|OFFICE\s*RELOCATION|MOVING\s*TRUCK/i, category: 'Rent & Facilities', flag: 'Office relocation cost — deductible; large relocation may need to be amortized' },

  // ── TRAINING & EDUCATION ──────────────────────────────────────
  { pattern: /CPA\s*(CANADA|EXAM|COURSE|DUES)|ICAO\b|CHARTERED\s*PROF\s*ACCOUNT/i, category: 'Training & Education', flag: 'Professional designation — CPA dues deductible; exam fees may be personal if not yet employed' },
  { pattern: /CONTINUING\s*(EDUCATION|ED\b)|CPD\s*CREDIT|PROFESSIONAL\s*DEVELOPMENT\s*COURSE/i, category: 'Training & Education', flag: 'Professional development — deductible if maintaining skills for current role' },
  { pattern: /UNIVERSITY\s*TUITION|COLLEGE\s*TUITION|BOOTCAMP\s*FEE|CODING\s*SCHOOL/i, category: 'Training & Education', flag: 'Tuition — deductible if for business skill maintenance; capital education may not qualify' },
  { pattern: /WORKSHOP\s*FEE|SEMINAR\s*FEE|MASTERMIND\s*GROUP|COACHING\s*FEE/i, category: 'Training & Education', flag: 'Training/coaching — deductible if directly related to business; personal development not deductible' },
  { pattern: /BOOK\s*PURCHASE|AMAZON\s*BOOKS?|CHAPTERS\s*INDIGO|MCNALLY\s*ROBINSON|TECHNICAL\s*BOOK/i, category: 'Training & Education', flag: 'Books/reference materials — deductible if business-related' },

  // ── CHARITABLE & NON-DEDUCTIBLE ───────────────────────────────
  { pattern: /CHARITABLE\s*DONAT|CHARITY\s*DONAT|UNITED\s*WAY|RED\s*CROSS|SALVATION\s*ARMY|FOOD\s*BANK/i, category: 'Miscellaneous', flag: '⚠ Charitable donation — not deductible as business expense; issue donation receipt for tax credit instead' },
  { pattern: /POLITICAL\s*CONTRIBUT|CAMPAIGN\s*DONAT|ELECTORAL\s*DISTRICT|PAC\s*CONTRIBUT/i, category: 'Miscellaneous', flag: '⚠ Political contribution — NOT deductible as business expense under CRA/IRS rules' },
  { pattern: /PERSONAL\s*WITHDRAW|OWNER\s*DRAW|SHAREHOLDER\s*LOAN|DRAWS?\s*FROM\s*BUSINESS/i, category: 'Transfer', flag: '⚠ Owner draw/shareholder withdrawal — NOT a business expense; record as equity reduction' },

  // ── INVENTORY & COGS ──────────────────────────────────────────
  { pattern: /WHOLESALE\s*PURCHASE|INVENTORY\s*PURCH|PRODUCT\s*INVENTORY|STOCK\s*PURCHASE(?!.*SHARES)/i, category: 'Cost of Goods Sold', flag: 'Inventory purchase — COGS item; ensure matched to revenue recognition period' },
  { pattern: /RAW\s*MATERIAL|DIRECT\s*MATERIAL|COMPONENT\s*PURCH|PARTS\s*ORDER/i, category: 'Cost of Goods Sold', flag: 'Raw materials — COGS; review BOM (bill of materials) for accurate job costing' },
  { pattern: /PACKAGING\s*MATERIAL|PACKAGING\s*SUPPLY|BOXES\s*TAPE\s*SHIP|POLYBAG|SHRINK\s*WRAP/i, category: 'Cost of Goods Sold', flag: 'Packaging — COGS or shipping expense; classify consistently' },
  { pattern: /PRODUCTION\s*LABOR|DIRECT\s*LABOR|ASSEMBLY\s*LABOR|FACTORY\s*WORKER/i, category: 'Cost of Goods Sold', flag: 'Direct labour — COGS; distinguish from indirect/overhead labour in Payroll' },
  { pattern: /MANUFACTURER|CONTRACT\s*MANUFACTUR|3PL\s*FULFILLMENT|THIRD\s*PARTY\s*LOGISTIC|SHIPHERO|SHIPBOB|EASYPOST/i, category: 'Cost of Goods Sold', flag: 'Fulfillment/manufacturing cost — COGS; track per-unit cost for margin analysis' },
  { pattern: /CUSTOMS\s*DUTY|IMPORT\s*DUTY|TARIFF\s*CHARGE|CBSA\s*DUTY|USITC\s*TARIFF/i, category: 'Cost of Goods Sold', flag: 'Import duty/tariff — COGS; document HS code and value for duty for customs compliance' },
  { pattern: /FREIGHT\s*IN|INBOUND\s*FREIGHT|IMPORT\s*FREIGHT|OCEAN\s*FREIGHT|AIR\s*FREIGHT\s*IMPORT/i, category: 'Cost of Goods Sold', flag: 'Inbound freight — COGS under GAAP; capitalize into inventory cost if material' },

  // ── GOVERNMENT & REGULATORY ───────────────────────────────────
  { pattern: /CRA\s*PAYMENT|REVENUE\s*CANADA\s*PAY|CANADA\s*REVENUE\s*AGENC/i, category: 'Income Tax Payable', flag: '⚠ CRA payment — classify correctly: HST remittance vs income tax installment vs payroll remittance' },
  { pattern: /IRS\s*PAYMENT|INTERNAL\s*REVENUE\s*SERV|EFTPS\s*PAYMENT/i, category: 'Income Tax Payable', flag: '⚠ IRS payment — distinguish: estimated taxes vs payroll deposit vs penalties' },
  { pattern: /HST\s*REMIT|GST\s*REMIT|PST\s*REMIT|QST\s*REMIT|HST\/GST\s*PAY|NETFILE\s*HST/i, category: 'HST/GST Payable', flag: 'HST/GST remittance — not an expense; reduces HST/GST payable liability account' },
  { pattern: /BUSINESS\s*LICENSE\s*FEE|OPERATING\s*PERMIT|MUNICIPAL\s*LICENSE|TRADE\s*LICENSE/i, category: 'Legal & Professional Fees', flag: 'Business license — deductible regulatory cost; renew annually and retain certificate' },
  { pattern: /CORPORATION\s*TAX\s*INSTAL|CORPORATE\s*TAX\s*PAY|T2\s*BALANCE\s*DUE|INCOME\s*TAX\s*INSTAL/i, category: 'Income Tax Payable', flag: '⚠ Corporate income tax payment — balance sheet item, NOT P&L expense; record to Income Tax Payable' },
  { pattern: /PENALTY\s*CRA|LATE\s*FILING\s*PENAL|INTEREST\s*CHARGED\s*CRA|CRA\s*INTEREST/i, category: 'Bank & Finance Charges', flag: '⚠ CRA penalty/interest — generally NOT deductible; document and correct filing practices' },

  // ── SUBSCRIPTIONS PERSONAL (EXPANDED) ───────────────────────
  { pattern: /PELOTON|EQUINOX\s*GYM|GOODLIFE\s*FITNESS|GYM\s*MEMBERSHIP|YOGA\s*STUDIO|CROSSFIT\s*GYM/i, category: 'Miscellaneous', flag: 'Personal fitness membership — NOT deductible as business expense; remove from expense reporting' },
  { pattern: /AMAZON\s*PRIME(?!\s*BUSINESS)|\bPRIME\s*VIDEO\b/i, category: 'Software & Subscriptions', flag: 'Amazon Prime — personal subscription; shipping savings may be business if used for commercial shipping' },
  { pattern: /APPLE\s*ICLOUD|ICLOUD\s*STORAGE|GOOGLE\s*ONE\s*STORAG/i, category: 'Software & Subscriptions', flag: 'Personal cloud storage — verify business vs personal use before claiming' },
  { pattern: /DATING\s*APP|BUMBLE\s*PREMIUM|TINDER\s*GOLD|MATCH\.COM\s*SUB/i, category: 'Miscellaneous', flag: '⚠ Personal dating app — NOT a business expense; remove from business accounts' },
  { pattern: /GAMBLING|CASINO|LOTTERY\s*TICKET|SPORTS\s*BET/i, category: 'Miscellaneous', flag: '⚠ Gambling/lottery — NOT deductible; winnings may be taxable income; remove from business accounts' },

  // ── R&D & INNOVATION ─────────────────────────────────────────
  { pattern: /LABORATORY\s*SUPPLY|LAB\s*EQUIPMENT|RESEARCH\s*SUPPLY|SCIENTIFIC\s*EQUIP/i, category: 'Research & Development', flag: 'R&D materials — SR&ED eligible expenditure; document project and work description for CRA' },
  { pattern: /PROTOTYPE\s*BUILD|PROOF\s*OF\s*CONCEPT|MVP\s*DEVELOP|FEASIBILITY\s*STUDY/i, category: 'Research & Development', flag: 'R&D project cost — potential SR&ED claim; retain technical documentation and time logs' },
  { pattern: /CLINICAL\s*TRIAL|DRUG\s*DEVELOP|BIOTECH\s*RESEARCH|MEDICAL\s*DEVICE\s*R&D/i, category: 'Research & Development', flag: 'Medical R&D — SR&ED eligible; maintain regulatory documentation (Health Canada / FDA)' },
  { pattern: /PATENT\s*MAINTEN|PATENT\s*ANNUITY|USPTO\s*FEE|CIPO\s*FEE/i, category: 'Research & Development', flag: 'Patent maintenance fee — deductible; consider capitalizing patent asset and amortizing' },

  // ── CONSTRUCTION & TRADES (VERTICAL) ────────────────────────
  { pattern: /LUMBER\s*YARD|HOME\s*DEPOT\s*(?!STORE)|RONA\s*PRO|KENT\s*BUILDING|EMCO\s*PLUMB/i, category: 'Cost of Goods Sold', flag: 'Construction material — job COGS; allocate to specific project for job costing accuracy' },
  { pattern: /CONCRETE\s*POUR|REBAR\s*SUPPLY|READY\s*MIX\s*CONCRETE|CEMENT\s*SUPPLY/i, category: 'Cost of Goods Sold', flag: 'Construction material — COGS; document project allocation' },
  { pattern: /SUBCONTRACT(?:OR)?\s*PAY|TRADE\s*CONTRACTOR|ELECTRICAL\s*SUBCON|PLUMBING\s*SUBCON/i, category: 'Contractor / Professional Services', flag: 'Subcontractor payment — T4A required if individual and annual payments ≥ $500; verify WSIB coverage' },
  { pattern: /EQUIPMENT\s*RENTAL|CRANE\s*RENTAL|SCISSOR\s*LIFT\s*RENT|SKID\s*STEER\s*RENT|FORKLIFT\s*RENT/i, category: 'Office Supplies & Equipment', flag: 'Equipment rental — expense; if >12 months consider whether finance lease rules apply' },
  { pattern: /BUILDING\s*PERMIT|SITE\s*PERMIT|DEMOLITION\s*PERMIT|OCCUPANCY\s*PERMIT/i, category: 'Legal & Professional Fees', flag: 'Building permit — capitalize as part of construction cost if building is capital asset' },

  // ── HEALTHCARE & MEDICAL (VERTICAL) ─────────────────────────
  { pattern: /MEDICAL\s*SUPPLY|SURGICAL\s*SUPPLY|HENRY\s*SCHEIN|MCKESSON\s*CANADA|CARDINAL\s*HEALTH/i, category: 'Cost of Goods Sold', flag: 'Medical supply — COGS or operating supply; document for regulated environment' },
  { pattern: /ELECTRONIC\s*HEALTH\s*RECORD|EHR\s*SYSTEM|OSCAR\s*EMR|ACCURO\s*EMR|TELUS\s*HEALTH\s*WOLF/i, category: 'Software & Subscriptions', flag: 'EHR/EMR subscription — deductible; verify PIPEDA / PHIPA compliance' },
  { pattern: /COLLEGE\s*OF\s*PHYSICIANS|CPSO\s*DUES|CMPA\s*FEE|CPSBC\s*DUES|CNO\s*DUES/i, category: 'Legal & Professional Fees', flag: 'Professional regulatory dues — deductible; required for license to practice' },
  { pattern: /MALPRACTICE\s*INS|CMPA\s*ASSESS|PROFESSIONAL\s*INDEMNITY/i, category: 'Insurance', flag: 'Malpractice/professional indemnity — deductible; critical coverage for regulated professions' },

  // ── CATCH-ALL IMPROVEMENTS ────────────────────────────────────
  { pattern: /AMZN\b|AMAZON\.CA|AMAZON\.COM(?!\/WEB)/i, category: 'Office Supplies & Equipment', flag: 'Amazon purchase — verify business purpose; mixed personal/business orders should be segregated' },
  { pattern: /ETSY\b|ALIBABA\b|ALIEXPRESS\b|MADE-IN-CHINA/i, category: 'Cost of Goods Sold', flag: 'Marketplace purchase — likely inventory/COGS; document supplier and product for customs compliance' },
  { pattern: /EBAY\b(?!\s*FEES)/i, category: 'Miscellaneous', flag: 'eBay purchase — verify if inventory, equipment, or personal; classify accordingly' },
  { pattern: /FACEBOOK\s*MARKETPLACE|KIJIJI|CRAIGSLIST/i, category: 'Miscellaneous', flag: 'Marketplace purchase — verify purpose; retain documentation for any significant amounts' },
  { pattern: /INTERAC\s*E.TRANSFER(?!\s*\*{3})/i, category: 'Transfer', flag: 'E-transfer — confirm payee and purpose; business payment or personal transfer?', checkDeposit: true },
  { pattern: /LOAN\s*REPAY|PRINCIPAL\s*PAYMENT|MORTGAGE\s*PRINCIPAL/i, category: 'Transfer', flag: 'Loan principal repayment — NOT an expense; reduces liability on balance sheet' },
  { pattern: /GST\/HST\s*INPUT|ITC\s*CLAIM|INPUT\s*TAX\s*CREDIT/i, category: 'HST/GST Payable', flag: 'ITC/input tax credit claim — reduces HST payable; must be on tax invoice to qualify' },
  { pattern: /INTERCOMPANY|RELATED\s*PARTY\s*TXN|AFFILIATED\s*CO\s*PAY/i, category: 'Transfer', flag: '⚠ Related party / intercompany transaction — requires transfer pricing documentation; consult accountant' },
  { pattern: /VOID\s*CHEQUE|STOP\s*PAYMENT\s*FEE/i, category: 'Bank & Finance Charges', flag: 'none' },

];

// Merge into main RULES_ENGINE if it exists
if (typeof RULES_ENGINE !== 'undefined' && Array.isArray(RULES_ENGINE)) {
  // Add extended rules — main rules take precedence (they run first)
  RULES_ENGINE.push(...EXTENDED_RULES);
  console.log('[LedgerAI] Rules engine extended: ' + RULES_ENGINE.length + ' total rules loaded');
} else {
  // Fallback — store for later merge
  window._EXTENDED_RULES = EXTENDED_RULES;
  console.warn('[LedgerAI] RULES_ENGINE not found — extended rules queued');
}

// Export count for settings display
window.EXTENDED_RULES_COUNT = EXTENDED_RULES.length;

})();
