/**
 * Defines the structure for crawler information and a list of known crawlers with their details.
 */
export interface CrawlerInfo {
  /** Name of the crawler. */
  name: string;
  /** Description of the crawler. */
  description: string;
  /** URL for more information about the crawler. */
  url?: string;
  /** Prefix of completion item. lowercase */
  prefix?: string;
  /** Key of the crawler this one inherits from. lowercase */
  inheritsFromKey?: string;
  /** Whether to hide hover information for the crawler. */
  hiddenHover: boolean;
  /** Whether to hide completion items for the crawler. */
  hiddenCompletion: boolean;
  /** WIP: List of fallback user agents for the crawler. */
  fallbackUserAgents?: string[];
}

// ref. <https://github.com/monperrus/crawler-user-agents/blob/master/crawler-user-agents.json>
/**
 * List of known crawlers and their information.
 * This is not exhaustive, but includes some of the most common ones.
 * The keys are lowercased for easier matching.
 */
export const CRAWLER_INFOS: Record<string, CrawlerInfo> = {
  "*": {
    name: "*",
    description: "All user-agents not explicitly listed.",
    hiddenHover: false,
    hiddenCompletion: false,
  },

  /* Google */
  googlebot: {
    name: "Googlebot",
    description: "Google's crawler for indexing.",
    url: "https://www.google.com/bot.html",
    hiddenHover: false,
    hiddenCompletion: false,
  },
  "googlebot-image": {
    name: "Googlebot-Image",
    description: "Google's crawler for indexing images.",
    prefix: "googlebot",
    inheritsFromKey: "googlebot",
    hiddenHover: false,
    hiddenCompletion: false,
    fallbackUserAgents: ["googlebot"],
  },
  "googlebot-video": {
    name: "Googlebot-Video",
    description: "Google's crawler for indexing videos.",
    prefix: "googlebot",
    inheritsFromKey: "googlebot",
    hiddenHover: false,
    hiddenCompletion: false,
    fallbackUserAgents: ["googlebot"],
  },
  "googlebot-news": {
    name: "Googlebot-News",
    description: "Google's crawler for indexing news.",
    prefix: "googlebot",
    inheritsFromKey: "googlebot",
    hiddenHover: false,
    hiddenCompletion: false,
    fallbackUserAgents: ["googlebot"],
  },
  "storebot-google": {
    name: "Storebot-Google",
    description: "Google's crawler for indexing store content.",
    inheritsFromKey: "googlebot",
    hiddenHover: false,
    hiddenCompletion: false,
  },
  "google-": {
    name: "Google-",
    description: "Placeholder entry for Google-* user agents.",
    hiddenHover: true,
    hiddenCompletion: false,
  },
  "google-inspectiontool": {
    name: "Google-InspectionTool",
    description: "Google's crawler for search testing tools.",
    prefix: "google-",
    inheritsFromKey: "googlebot",
    hiddenHover: false,
    hiddenCompletion: false,
    fallbackUserAgents: ["googlebot"],
  },
  "google-cloudvertexbot": {
    name: "Google-CloudVertexBot",
    description: "Google's crawler for Vertex AI Agents.",
    prefix: "google-",
    inheritsFromKey: "googlebot",
    hiddenHover: false,
    hiddenCompletion: false,
    fallbackUserAgents: ["googlebot"],
  },
  "google-extended": {
    name: "Google-Extended",
    description: "Google's crawler for Gemini Apps and Vertex AI.",
    prefix: "google-",
    inheritsFromKey: "googlebot",
    hiddenHover: false,
    hiddenCompletion: false,
  },
  googleother: {
    name: "GoogleOther",
    description: "Google's crawler for internal research and development.",
    inheritsFromKey: "googlebot",
    hiddenHover: false,
    hiddenCompletion: false,
  },
  "googleother-image": {
    name: "GoogleOther-Image",
    description: "Google's crawler for internal research and development.",
    prefix: "googleother",
    inheritsFromKey: "googlebot",
    hiddenHover: false,
    hiddenCompletion: false,
    fallbackUserAgents: ["googleother"],
  },
  "googleother-video": {
    name: "GoogleOther-Video",
    description: "Google's crawler for internal research and development.",
    prefix: "googleother",
    inheritsFromKey: "googlebot",
    hiddenHover: false,
    hiddenCompletion: false,
    fallbackUserAgents: ["googleother"],
  },
  "apis-google": {
    name: "APIs-Google",
    description:
      "Google's crawler for API monitoring and service health checks.",
    inheritsFromKey: "googlebot",
    hiddenHover: false,
    hiddenCompletion: false,
  },
  "adsbot-google-mobile": {
    name: "AdsBot-Google-Mobile",
    description:
      "Google's crawler for testing mobile-friendliness of landing pages for ads.",
    inheritsFromKey: "googlebot",
    hiddenHover: false,
    hiddenCompletion: false,
  },
  "adsbot-google": {
    name: "AdsBot-Google",
    description:
      "Google's crawler for testing the quality of landing pages for ads.",
    inheritsFromKey: "googlebot",
    hiddenHover: false,
    hiddenCompletion: false,
  },
  "mediapartners-google": {
    name: "Mediapartners-Google",
    description:
      "Google's crawler for AdSense content analysis and ad targeting.",
    inheritsFromKey: "googlebot",
    hiddenHover: false,
    hiddenCompletion: false,
  },

  /* Microsoft */
  bingbot: {
    name: "Bingbot",
    description: "Microsoft's crawler for indexing.",
    url: "https://www.bing.com/bingbot.htm",
    hiddenCompletion: false,
    hiddenHover: false,
  },
  adidxbot: {
    name: "AdIdxBot",
    description: "Microsoft's crawler for ad quality and policy checks.",
    inheritsFromKey: "bingbot",
    hiddenCompletion: false,
    hiddenHover: false,
  },
  microsoftpreview: {
    name: "MicrosoftPreview",
    description: "Microsoft's crawler for previewing content.",
    inheritsFromKey: "bingbot",
    hiddenHover: false,
    hiddenCompletion: false,
  },
  bingvideopreview: {
    name: "BingVideoPreview",
    description: "Microsoft's crawler for previewing video.",
    inheritsFromKey: "bingbot",
    hiddenHover: false,
    hiddenCompletion: false,
  },

  /* Apple */
  applebot: {
    name: "Applebot",
    description: "Apple's crawler for indexing.",
    url: "https://www.apple.com/go/applebot",
    hiddenHover: false,
    hiddenCompletion: false,
    fallbackUserAgents: ["googlebot"],
  },
  "applebot-extended": {
    name: "Applebot-Extended",
    description: "Apple's crawler for Generative AI.",
    prefix: "applebot",
    inheritsFromKey: "applebot",
    hiddenHover: false,
    hiddenCompletion: false,
    fallbackUserAgents: ["applebot", "googlebot"],
  },

  /* Yandex */
  yandex: {
    name: "Yandex",
    description: "Yandex's crawler for indexing.",
    url: "https://yandex.com/bots",
    hiddenHover: false,
    hiddenCompletion: false,
  },

  /* Baidu */
  baiduspider: {
    name: "Baiduspider",
    description: "Baidu's crawler for indexing.",
    url: "https://www.baidu.com/search/spider.htm",
    hiddenHover: false,
    hiddenCompletion: false,
  },
  "baiduspider-image": {
    name: "Baiduspider-Image",
    description: "Baidu's crawler for indexing images.",
    prefix: "baiduspider",
    inheritsFromKey: "baiduspider",
    hiddenHover: false,
    hiddenCompletion: false,
  },
  "baiduspider-video": {
    name: "Baiduspider-Video",
    description: "Baidu's crawler for indexing videos.",
    prefix: "baiduspider",
    inheritsFromKey: "baiduspider",
    hiddenHover: false,
    hiddenCompletion: false,
  },

  /* Yahoo */
  slurp: {
    name: "Slurp",
    description: "Yahoo's crawler for indexing.",
    url: "https://help.yahoo.com/help/us/ysearch/slurp",
    hiddenHover: false,
    hiddenCompletion: false,
  },

  /* DuckDuckGo */
  duckduckbot: {
    name: "DuckDuckBot",
    description: "DuckDuckGo's crawler for indexing.",
    url: "https://duckduckgo.com/duckduckbot.html",
    hiddenHover: false,
    hiddenCompletion: false,
  },

  /* Facebook / Meta */
  facebookexternalhit: {
    name: "FacebookExternalHit",
    description: "Facebook's crawler for indexing and link previews.",
    url: "https://www.facebook.com/externalhit_uatext.php",
    hiddenHover: false,
    hiddenCompletion: false,
  },
  "meta-": {
    name: "Meta-",
    description: "Placeholder entry for Meta-* user agents.",
    hiddenHover: true,
    hiddenCompletion: false,
  },
  "meta-webindexer": {
    name: "Meta-WebIndexer",
    description: "Meta's crawler for Meta AI.",
    prefix: "meta-",
    inheritsFromKey: "facebookexternalhit",
    hiddenHover: false,
    hiddenCompletion: false,
  },
  "meta-externalads": {
    name: "Meta-ExternalAds",
    description: "Meta's crawler for qualifying ads.",
    prefix: "meta-",
    inheritsFromKey: "facebookexternalhit",
    hiddenHover: false,
    hiddenCompletion: false,
  },
  "meta-externalagent": {
    name: "Meta-ExternalAgent",
    description: "Meta's crawler for AI model training.",
    prefix: "meta-",
    inheritsFromKey: "facebookexternalhit",
    hiddenHover: false,
    hiddenCompletion: false,
  },
  "meta-externalfetcher": {
    name: "Meta-ExternalFetcher",
    description: "Meta's crawler for qualifying AI agents.",
    prefix: "meta-",
    inheritsFromKey: "facebookexternalhit",
    hiddenHover: false,
    hiddenCompletion: false,
  },

  /* OpenAI */
  gptbot: {
    name: "GPTBot",
    description: "OpenAI's GPT crawler for generative AI.",
    url: "https://openai.com/gptbot",
    hiddenHover: false,
    hiddenCompletion: false,
  },
  "chatgpt-user": {
    name: "ChatGPT-User",
    description: "OpenAI's GPT fetcher for user requests.",
    inheritsFromKey: "gptbot",
    hiddenHover: false,
    hiddenCompletion: false,
  },
  "oai-": {
    name: "OAI-",
    description: "Placeholder entry for OAI-* user agents.",
    hiddenHover: true,
    hiddenCompletion: false,
  },
  "oai-adsbot": {
    name: "OAI-AdsBot",
    description: "OpenAI's GPT crawler for ads.",
    prefix: "oai-",
    inheritsFromKey: "gptbot",
    hiddenHover: false,
    hiddenCompletion: false,
  },
  "oai-searchbot": {
    name: "OAI-SearchBot",
    description: "OpenAI's GPT crawler for search.",
    prefix: "oai-",
    inheritsFromKey: "gptbot",
    hiddenHover: false,
    hiddenCompletion: false,
  },

  /* Amazon */
  amazonbot: {
    name: "Amazonbot",
    description:
      "Amazon's crawler for service quality checks and AI-related processing.",
    url: "https://developer.amazon.com/support/amazonbot",
    hiddenHover: false,
    hiddenCompletion: false,
  },
  "amzn-": {
    name: "Amzn-",
    description: "Placeholder entry for Amzn-* user agents.",
    hiddenHover: true,
    hiddenCompletion: false,
  },
  "amzn-searchbot": {
    name: "Amzn-SearchBot",
    description:
      "Amazon's crawler for Alexa and Rufus retrieval, not model training.",
    prefix: "amzn-",
    inheritsFromKey: "amazonbot",
    hiddenHover: false,
    hiddenCompletion: false,
  },
  "amzn-user": {
    name: "Amzn-User",
    description:
      "Amazon's fetcher for user requests to Alexa and Rufus without AI training.",
    prefix: "amzn-",
    inheritsFromKey: "amazonbot",
    hiddenHover: false,
    hiddenCompletion: false,
  },

  /* Perplexity */
  perplexitybot: {
    name: "PerplexityBot",
    description: "Perplexity's crawler for indexing without AI training.",
    url: "https://perplexity.ai/perplexitybot",
    hiddenHover: false,
    hiddenCompletion: false,
  },
  "perplexity-user": {
    name: "Perplexity-User",
    description: "Perplexity's fetcher for user requests without AI training.",
    inheritsFromKey: "perplexitybot",
    hiddenHover: false,
    hiddenCompletion: false,
  },

  /* Anthropic */
  claudebot: {
    name: "ClaudeBot",
    description: "Anthropic's crawler for AI training.",
    url: "https://support.anthropic.com/",
    hiddenHover: false,
    hiddenCompletion: false,
  },
  "claude-user": {
    name: "Claude-User",
    description: "Anthropic's fetcher for user requests.",
    inheritsFromKey: "claudebot",
    hiddenHover: false,
    hiddenCompletion: false,
  },
  "claude-searchbot": {
    name: "Claude-SearchBot",
    description: "Anthropic's crawler for indexing.",
    inheritsFromKey: "claudebot",
    hiddenHover: false,
    hiddenCompletion: false,
  },

  /* ByteDance / TikTok */
  bytespider: {
    name: "Bytespider",
    description: "ByteDance's crawler for indexing and AI training.",
    hiddenHover: false,
    hiddenCompletion: false,
  },

  /* Internet Archive */
  "archive.org_bot": {
    name: "archive.org_bot",
    description: "Internet Archive's crawler for archiving.",
    url: "https://archive.org/details/archive.org_bot",
    hiddenHover: false,
    hiddenCompletion: true,
  },

  /* Other */
  seznambot: {
    name: "SeznamBot",
    description: "Crawler for Seznam, a Czech search engine.",
    hiddenHover: false,
    hiddenCompletion: true,
  },
  coccocbot: {
    name: "CoccocBot",
    description: "Crawler for Coccoc, a Vietnamese search engine.",
    url: "https://help.coccoc.com/searchengine",
    hiddenHover: false,
    hiddenCompletion: true,
  },
  sogou: {
    name: "Sogou",
    description: "Crawler for Sogou, a Chinese search engine.",
    url: "https://www.sogou.com/docs/help/webmasters.htm#07",
    hiddenHover: false,
    hiddenCompletion: true,
  },
  timpibot: {
    name: "Timpibot",
    description: "Timpi's crawler.",
    hiddenHover: false,
    hiddenCompletion: true,
  },
  ccbot: {
    name: "CCBot",
    description: "Common Crawl's crawler for web archiving.",
    url: "https://commoncrawl.org/faq/",
    hiddenHover: false,
    hiddenCompletion: true,
  },
  petalbot: {
    name: "PetalBot",
    description: "PetalBot is the web crawler used by Petal Search.",
    url: "https://aspiegel.com/petalbot",
    hiddenHover: false,
    hiddenCompletion: true,
  },
  semrushbot: {
    name: "SemrushBot",
    description: "SemrushBot is the crawler used by Semrush.",
    url: "https://www.semrush.com/bot.html",
    hiddenHover: false,
    hiddenCompletion: true,
  },
  dotbot: {
    name: "DotBot",
    description:
      "Moz's crawler for Link Explorer (formerly Open Site Explorer).",
    url: "https://www.opensiteexplorer.org/dotbot",
    hiddenHover: false,
    hiddenCompletion: true,
  },
  mj12bot: {
    name: "MJ12bot",
    description: "MJ12bot is the crawler used by Majestic-12.",
    url: "https://www.majestic12.co.uk/bot.php",
    hiddenHover: false,
    hiddenCompletion: true,
  },
  ahrefsbot: {
    name: "AhrefsBot",
    description: "AhrefsBot is the crawler used by Ahrefs.",
    url: "https://ahrefs.com/robot/",
    hiddenHover: false,
    hiddenCompletion: true,
  },
} as const;
