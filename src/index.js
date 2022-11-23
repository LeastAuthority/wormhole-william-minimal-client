//#region init
let client;

async function init() {
  const go = new Go();
  const wasm = await WebAssembly.instantiateStreaming(
    fetch("/wormhole.wasm"),
    go.importObject
  );
  go.run(wasm.instance);
  client = Wormhole.Client.newClient({
    rendezvousURL: "wss://mailbox.stage.mw.leastauthority.com:443/v1",
    transitRelayURL: "wss://relay.stage.mw.leastauthority.com:443",
    passPhraseComponentLength: 2,
  });
}

init();
//#endregion

//#region progress bar
const progressBar = document.createElement("progress");
progressBar.max = 100;
document.body.appendChild(progressBar);

const progressInfo = document.createElement("div");
document.body.appendChild(progressInfo);

let lastUpdate = Date.now();
function progressFunc(sentBytes, totalBytes) {
  const now = Date.now();
  // 10 updates a second
  if (now - lastUpdate > 100) {
    progressBar.value = Math.round((sentBytes / totalBytes) * 100);

    progressInfo.innerHTML = `Bytes processed: ${sentBytes}<br /><code>${(
      (sentBytes / totalBytes) *
      100
    )
      .toFixed(2)
      .padStart(6, "0")}% complete</code>`;

    lastUpdate = now;
  }
}
//#endregion

//#region send
const downloadCode = document.createElement("div");
document.body.appendChild(downloadCode);

const uploadInput = document.createElement("input");
uploadInput.type = "file";
uploadInput.addEventListener("change", (e) => {
  console.log("generating code...");
  Wormhole.Client.sendFile(client, e.target.files[0].name, e.target.files[0], {
    progressFunc,
  })
    .then(({ code, cancel, done }) => {
      console.log(`code: ${code}`);
      downloadCode.innerHTML = code;
      done
        .then(() => {
          console.log("send success");
        })
        .catch((error) => {
          console.error(error);
          console.error("send failed");
        });
    })
    .catch((error) => {
      console.error(error);
      console.error("send failed");
    });
});
document.body.appendChild(uploadInput);
//#endregion

//#region receive
const codeInput = document.createElement("input");
codeInput.type = "text";
document.body.appendChild(codeInput);

const submitButton = document.createElement("button");
submitButton.innerHTML = "submit code";
submitButton.addEventListener("click", () => {
  console.log("starting download...");
  Wormhole.Client.recvFile(client, codeInput.value, {
    progressFunc,
  })
    .then(async (reader) => {
      console.log("downloading...");
      const startTime = new Date();
      let done = false;
      while (!done) {
        const buffer = new Uint8Array(reader.bufferSizeBytes);
        try {
          [n, done] = await reader.read(buffer);
        } catch (error) {
          return Promise.reject(error);
        }
      }
      const endTime = new Date();
      const secondsElapsed = (endTime - startTime) / 1000;
      console.log(`done in ${secondsElapsed} seconds`);
    })
    .catch((error) => {
      console.error(error);
      console.error("receive failed");
    });
});
document.body.appendChild(submitButton);
//#endregion
