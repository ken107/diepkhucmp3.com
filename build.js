const {promisify} = require("util");
const fs = require("fs");
const proc = require("child_process");


exports.build = async function() {
  await fs.mkdir("build", err => "OK");
  await Promise.all([
  this.copyHTML(),
    this.buildJS(),
    this.buildCSS()
  ])
}

exports.copyHTML = async function() {
  await promisify(proc.exec)("cp -ur web/*.html web/img web/fonts build");
}

exports.buildJS = async function() {
  await fs.mkdir("build/js", err => "OK");

  const jsFiles = ["jquery.js", "popper.js", "bootstrap.js", "databind.js", "util.js", "components.js", "index.js"].map(file => `web/js/${file}`);
  const outFile = "build/js/pack.js";
  const outFileMin = "build/js/pack.min.js";

  const areNewer = await Promise.all(jsFiles.map(file => isNewer(file, outFile)));
  if (!areNewer.some(x => x)) {
  console.log("No JS changes");
  return;
  }

  const str = fs.createWriteStream(outFile);
  for (const file of jsFiles) await copyStream(fs.createReadStream(file), str);
  str.end();
}

exports.buildCSS = async function() {
  await fs.mkdir("build/css", err => "OK");

  const files = ["bootstrap.css", "common.css", "components.css", "index.css"].map(file => `web/css/${file}`);
  const outFile = "build/css/pack.css";
  const outFileMin = "build/css/pack.min.css";

  const areNewer = await Promise.all(files.map(file => isNewer(file, outFile)));
  if (!areNewer.some(x => x)) {
    console.log("No CSS changes");
    return;
  }

  const str = fs.createWriteStream(outFile);
  for (const file of files) await copyStream(fs.createReadStream(file), str);
  str.end();
}


async function isNewer(srcFile, dstFile) {
  const srcStat = await promisify(fs.stat)(srcFile);
  try {
  const dstStat = await promisify(fs.stat)(dstFile);
  return srcStat.mtime > dstStat.mtime;
  }
  catch (err) {
  return true;
  }
}

function copyStream(src, dst) {
  return new Promise(function(fulfill, reject) {
  src.pipe(dst, {end: false});
  src.on("error", reject);
  src.on("end", fulfill);
  })
}

if (require.main == module) {
  const task = process.argv[2];
  if (task) exports[task]();
  else console.error("No task specified");
}
