/**
 * Builds the Study OS Android app (a Trusted Web Activity wrapping the live
 * site) with Google's Bubblewrap tooling.
 *
 *   node android-twa/build-apk.cjs
 *
 * Needs: JDK 17+ (JAVA_HOME or C:\Program Files\Java\jdk-*), Android SDK
 * (ANDROID_HOME or %LOCALAPPDATA%\Android\Sdk), and `npm i @bubblewrap/core`
 * available to this script (BUBBLEWRAP_DIR can point at its node_modules).
 *
 * Output: public/downloads/study-os.apk + public/.well-known/assetlinks.json
 * The signing keystore lives in android-twa/keystore (git-ignored) — KEEP IT:
 * every future update must be signed with the same key or phones will refuse
 * to install it over the old version.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const bwDir = process.env.BUBBLEWRAP_DIR || path.join(root, "node_modules");
const bw = require(path.join(bwDir, "@bubblewrap", "core"));

const HOST = process.env.TWA_HOST || "study-os-indol.vercel.app";
const PACKAGE_ID = "app.vercel.studyos.twa";
const APP_VERSION_CODE = Number(process.env.TWA_VERSION_CODE || 1);
const APP_VERSION_NAME = process.env.TWA_VERSION_NAME || "1.0.0";

function findJdk() {
  if (process.env.JAVA_HOME) return process.env.JAVA_HOME;
  const base = "C:\\Program Files\\Java";
  const jdk = fs.readdirSync(base).filter((d) => d.startsWith("jdk")).sort().pop();
  return path.join(base, jdk);
}
const JDK = findJdk();
const SDK = process.env.ANDROID_HOME || path.join(process.env.LOCALAPPDATA, "Android", "Sdk");

const work = path.join(__dirname, "project");
const keystoreDir = path.join(__dirname, "keystore");
const keystore = path.join(keystoreDir, "study-os.keystore");
const secretFile = path.join(keystoreDir, "password.txt");
fs.mkdirSync(keystoreDir, { recursive: true });

let password = "";
function run(cmd, args, opts = {}) {
  console.log(">", cmd, args.map((a) => (/^pass:/.test(a) || a === password ? "***" : a)).join(" "));
  execFileSync(cmd, args, {
    stdio: "inherit",
    shell: process.platform === "win32" && /\.(bat|cmd)$/i.test(cmd),
    env: { ...process.env, JAVA_HOME: JDK, ANDROID_HOME: SDK, ANDROID_SDK_ROOT: SDK },
    ...opts,
  });
}

(async () => {
  const log = new bw.ConsoleLog("twa");
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "public", "manifest.json"), "utf8"));
  const manifestUrl = new URL(`https://${HOST}/manifest.json`);

  const twa = bw.TwaManifest.fromWebManifestJson(manifestUrl, manifest);
  twa.packageId = PACKAGE_ID;
  twa.host = HOST;
  twa.name = "Study OS";
  twa.launcherName = "Study OS";
  twa.startUrl = "/dashboard";
  twa.appVersionCode = APP_VERSION_CODE;
  twa.appVersionName = APP_VERSION_NAME;
  twa.fallbackType = "customtabs";
  twa.enableNotifications = false;
  twa.signingKey = { path: keystore, alias: "studyos" };
  // Only used to embed a copy of the manifest for share targets; we build from
  // the local manifest instead, so the build doesn't depend on a deploy.
  twa.webManifestUrl = undefined;
  // Icons are read from the live site by URL — make sure a deploy with them exists.
  twa.iconUrl = `https://${HOST}/icons/icon-512.png`;
  twa.maskableIconUrl = `https://${HOST}/icons/icon-512.png`;

  if (fs.existsSync(work)) fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(work, { recursive: true });
  await new bw.TwaGenerator().createTwaProject(work, twa, log);
  await twa.saveToFile(path.join(work, "twa-manifest.json"));

  // Keystore — created once, then reused for every future build.
  if (fs.existsSync(secretFile)) {
    password = fs.readFileSync(secretFile, "utf8").trim();
  } else {
    password = crypto.randomBytes(18).toString("base64url");
    fs.writeFileSync(secretFile, password + "\n");
  }
  const keytool = path.join(JDK, "bin", "keytool.exe");
  if (!fs.existsSync(keystore)) {
    run(keytool, [
      "-genkeypair", "-v", "-keystore", keystore, "-alias", "studyos", "-keyalg", "RSA", "-keysize", "2048",
      "-validity", "10000", "-storepass", password, "-keypass", password,
      "-dname", "CN=Study OS, OU=Study OS, O=Study OS, C=IN",
    ]);
  }

  fs.writeFileSync(path.join(work, "local.properties"), `sdk.dir=${SDK.replace(/\\/g, "\\\\")}\n`);
  const gradlew = path.join(work, process.platform === "win32" ? "gradlew.bat" : "gradlew");
  run(gradlew, ["assembleRelease", "--no-daemon", "--stacktrace"], { cwd: work });

  const unsigned = path.join(work, "app", "build", "outputs", "apk", "release", "app-release-unsigned.apk");
  const buildTools = fs.readdirSync(path.join(SDK, "build-tools")).sort().pop();
  const bt = path.join(SDK, "build-tools", buildTools);
  const aligned = path.join(work, "app-release-aligned.apk");
  const outDir = path.join(root, "public", "downloads");
  fs.mkdirSync(outDir, { recursive: true });
  const signed = path.join(outDir, "study-os.apk");
  run(path.join(bt, "zipalign.exe"), ["-v", "-f", "-p", "4", unsigned, aligned], { stdio: "ignore" });
  run(path.join(bt, "apksigner.bat"), [
    "sign", "--ks", keystore, "--ks-key-alias", "studyos", "--ks-pass", `pass:${password}`,
    "--key-pass", `pass:${password}`, "--out", signed, aligned,
  ]);

  // Digital Asset Links: proves the app and the site belong together, so the
  // app opens full-screen without a browser URL bar.
  const listing = execFileSync(keytool, ["-list", "-v", "-keystore", keystore, "-alias", "studyos", "-storepass", password]).toString();
  const sha256 = listing.match(/SHA256:\s*([0-9A-F:]+)/i)[1].trim();
  const wellKnown = path.join(root, "public", ".well-known");
  fs.mkdirSync(wellKnown, { recursive: true });
  fs.writeFileSync(
    path.join(wellKnown, "assetlinks.json"),
    JSON.stringify(
      [{ relation: ["delegate_permission/common.handle_all_urls"], target: { namespace: "android_app", package_name: PACKAGE_ID, sha256_cert_fingerprints: [sha256] } }],
      null,
      2
    ) + "\n"
  );
  console.log("\nAPK:", signed, `(${(fs.statSync(signed).size / 1024 / 1024).toFixed(2)} MB)`);
  console.log("SHA-256:", sha256);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
