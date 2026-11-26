/**
 * Programmatic login to sis.cuhk.edu.cn (PeopleSoft + CUHKSZ ADFS SSO).
 *
 * Reverse-engineered from the browser flow and verified end-to-end (2026-11-26):
 * homepage HTML with full menu retrieved in ~1.5s using student ID + password.
 *
 * Key findings vs. naive implementations (all three are required):
 * 1. Username needs the AD domain prefix: ADFS page JS prepends `cuhksz\`
 *    when the input contains neither `@` nor `\`. Posting the bare student ID
 *    is rejected with "用户名或密码不正确".
 * 2. The username/password pagination is client-side JS only. Both fields are
 *    sent in ONE POST to the exact form action URL (which carries the
 *    client-request-id parameter).
 * 3. OAuth `code` is short-lived. Redirect hops (302/303) must NOT download
 *    response bodies — the servers trickle them slowly enough that reading
 *    every body pushes the chain past the code TTL, and cmd=login then fails
 *    with errorCode=105. Read bodies only for 200 responses.
 */

const CLIENT_ID = "3f09a73c-33cf-49b8-8f0c-b79ea2f3e83b";
const REDIRECT_URI = "https://sis.cuhk.edu.cn/sso/dologin.html";
const AUTHORIZE_URL = `https://sts.cuhk.edu.cn/adfs/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
const UA = "Mozilla/5.0 Firefox/153.0";
const DEVICE_FEATURES = "width:1440 height:900 pixelratio:1 touch:0 geolocation:0 websockets:1 webworkers:1 datepicker:1 dtpicker:1 timepicker:1 dnd:1 sessionstorage:1 localstorage:1 history:1 canvas:1 svg:1 postmessage:1 hc:0";

type CookieJar = Map<string, string>; // "name|domain" → value

function cookieHeader(jar: CookieJar, host: string): string {
  return [...jar.entries()]
    .filter(([k]) => {
      const dom = k.split("|").pop()!;
      return dom === host || (dom.startsWith(".") && (host.endsWith(dom) || host === dom.slice(1)));
    })
    .map(([k, v]) => `${k.split("|")[0]}=${v}`)
    .join("; ");
}

function saveCookies(jar: CookieJar, resp: Response, url: string): void {
  const host = new URL(url).host;
  for (const c of resp.headers.getSetCookie?.() ?? []) {
    const parts = c.split(";").map((s) => s.trim());
    const eq = parts[0].indexOf("=");
    const domainAttr = parts.find((p) => /^domain=/i.test(p));
    const dom = domainAttr ? domainAttr.split("=")[1].trim() : host;
    jar.set(parts[0].slice(0, eq) + "|" + dom, parts[0].slice(eq + 1));
  }
}

interface StepResult {
  status: number;
  location: string | null;
  data: string;
  url: string;
}

async function step(
  jar: CookieJar,
  method: string,
  target: string,
  values?: Record<string, string>,
  skipBody = false
): Promise<StepResult> {
  const host = new URL(target).host;
  const headers: Record<string, string> = { "user-agent": UA, cookie: cookieHeader(jar, host) };
  let body: string | undefined;
  if (values && method !== "GET") {
    body = new URLSearchParams(values).toString();
    headers["content-type"] = "application/x-www-form-urlencoded";
    headers["origin"] = "https://" + host;
    headers["referer"] = target;
  }
  const resp = await fetch(target, { method, headers, body, redirect: "manual" });
  saveCookies(jar, resp, target);
  // CRITICAL: never read bodies of redirect responses — slow trickle kills the code TTL.
  const data = skipBody && resp.status !== 200 ? "" : await resp.text();
  return { status: resp.status, location: resp.headers.get("location"), data, url: target };
}

export interface SisSession {
  cookieHeader: (host: string) => string;
  fetch: (url: string) => Promise<StepResult>;
  homepageHtml: string;
}

/**
 * Log in to SIS with a student ID and password.
 * Throws with a descriptive message at the exact failing stage.
 */
export async function sisLogin(username: string, password: string): Promise<SisSession> {
  const jar: CookieJar = new Map();
  const setSisCookie = (name: string, value: string) => jar.set(name + "|sis.cuhk.edu.cn", value);

  // Mirror the reference client: clear server-side session state first.
  await step(jar, "GET", "https://sis.cuhk.edu.cn/psp/csprd/EMPLOYEE/HRMS/?cmd=logout", undefined, true);
  await step(jar, "GET", "https://sis.cuhk.edu.cn/sso/login.html", undefined, true);
  setSisCookie("languageCd", "ENG");

  // ADFS: fetch the login form, keep hidden inputs, override user/pass.
  const authPage = await step(jar, "GET", AUTHORIZE_URL);
  const formMatch = authPage.data.match(/<form[^>]*id="loginForm"[\s\S]*?<\/form>/);
  if (!formMatch) throw new Error("ADFS login form not found");
  const inputs: Record<string, string> = {};
  for (const m of formMatch[0].matchAll(/<input[^>]*>/g)) {
    const name = m[0].match(/name="([^"]*)"/)?.[1];
    if (name) inputs[name] = m[0].match(/value="([^"]*)"/)?.[1] || "";
  }
  const domainUser = /[@\\]/.test(username) ? username : `cuhksz\\${username}`;
  for (const name of Object.keys(inputs)) {
    const lower = name.toLowerCase();
    if (/user|account|login/.test(lower)) inputs[name] = domainUser;
    if (/pass|pwd/.test(lower)) inputs[name] = password;
  }
  const action = "https://sts.cuhk.edu.cn" + authPage.data.match(/id="loginForm"[^>]*action="([^"]+)"/)![1].replace(/&amp;/g, "&");

  const posted = await step(jar, "POST", action, inputs, true);
  if (posted.status !== 302) throw new Error("credentials rejected by ADFS");

  // Follow the redirect chain (bodies skipped) until the OAuth code redirect.
  let code: string | null = null;
  let r = posted;
  for (let hop = 0; hop < 10 && r.location; hop++) {
    const next = r.location.startsWith("http") ? r.location : "https://sts.cuhk.edu.cn" + r.location;
    if (next.includes("sis.cuhk.edu.cn") && next.includes("code=")) {
      code = new URL(next).searchParams.get("code");
      await step(jar, "GET", next, undefined, true); // dologin.html bootstrap page
      break;
    }
    r = await step(jar, "GET", next, undefined, true);
  }
  if (!code) throw new Error("no OAuth code in redirect chain");

  // PeopleSoft signon: replicate the dologin.html form POST.
  setSisCookie("PS_DEVICEFEATURES", DEVICE_FEATURES);
  const rnd = Array.from({ length: 10 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join("");
  const loginUrl = "https://sis.cuhk.edu.cn/psp/csprd/?" + new URLSearchParams({ cmd: "login", languageCd: "ENG", code }).toString();
  const after = await step(jar, "POST", loginUrl, {
    timezoneOffset: "-480",
    ptmode: "f",
    ptlangcd: "ENG",
    ptinstalledlang: "ENG,ZHT,ZHS",
    userid: "CUSZ_SSO_LOGIN",
    pwd: rnd,
    ptlangsel: "ENG",
  }, true);
  if ((after.location ?? "").includes("errorCode")) {
    throw new Error("PeopleSoft signon failed: " + after.location);
  }

  // Follow through to the student homepage (real bodies needed here).
  let home = after;
  let homepageHtml = "";
  for (let hop = 0; hop < 10 && home.location; hop++) {
    const next = home.location.startsWith("http") ? home.location : "https://sis.cuhk.edu.cn" + home.location;
    home = await step(jar, "GET", next);
    if (home.status === 200 && home.data.length > 2000) {
      homepageHtml = home.data;
      break;
    }
  }
  if (!homepageHtml) throw new Error("session established but homepage unreachable");

  return {
    cookieHeader: (host: string) => cookieHeader(jar, host),
    fetch: (url: string) => step(jar, "GET", url),
    homepageHtml,
  };
}
