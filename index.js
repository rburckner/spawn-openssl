/**
 * Module name: Spawn OpenSSL
 *
 * Description: Module spawns an instance of OpenSSL
 *
 * Significantly inspired by https://github.com/mgcrea/node-openssl-wrapper
 **/
"use strict";
const { spawn } = require("child_process");

function isFunction(funct) {
  return typeof funct === "function";
}

const expectedStderrForAction = {
  "cms.verify": /^verification successful/i,
  genrsa: /^generating/i,
  pkcs12: /^mac verified ok/i,
  "req.new": /^generating/i,
  "req.verify": /^verify ok/i,
  rsa: /^writing rsa key/i,
  "smime.verify": /^verification successful/i,
  "x509.req": /^signature ok/i,
};

module.exports = function spawnOpenSSL(commandAndParams, arg2, arg3, arg4) {
  let buffer = arg2;
  let options = arg3;
  let callback = arg4;

  if (typeof commandAndParams !== "string") {
    throw new Error(`First argument must be a string command. OpenSSL command and arguments expected.`);
  }

  commandAndParams = commandAndParams.split(" ");

  // accomodate call without a buffer argument
  if (!Buffer.isBuffer(arg2)) {
    callback = arg3;
    options = arg2;
    buffer = false;
  }

  if (typeof options !== "object") {
    if (buffer) {
      throw new Error(
        `Third argument must be an object of options. Options are directly passed to the nodejs spawn command`
      );
    } else {
      throw new Error(
        `Second argument must be an object of options. Options are directly passed to the nodejs spawn command`
      );
    }
  }

  const openssl = spawn("openssl", commandAndParams, options);
  const outResult = [];
  let outLength = 0;
  const errResult = [];
  let errLength = 0;

  openssl.stdout.on("data", (data) => {
    outLength += data.length;
    outResult.push(data);
  });

  openssl.stderr.on("data", (data) => {
    errLength += data.length;
    errResult.push(data);
  });

  openssl.on("close", (code) => {
    const stdout = Buffer.concat(outResult, outLength).toString("utf8");
    const stderr = Buffer.concat(errResult, errLength).toString("utf8");
    const expectedStderr = expectedStderrForAction[commandAndParams[0]];
    let err = null;

    if (code || (stderr && expectedStderr && !stderr.match(expectedStderr))) {
      err = new Error(stderr);
      err.code = code;
    }

    if (isFunction(callback)) {
      callback.apply(null, [err, stdout]);
    }
  });

  if (buffer) {
    openssl.stdin.write(buffer);
  }

  openssl.stdin.end();

  return openssl;
};
