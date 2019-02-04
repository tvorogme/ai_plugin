const https = require('https');
const fs = require('fs');
const fstream = require('fstream');
const unzip = require('unzip');

const cep_extension_path = "C:\\Program Files (x86)\\Common Files\\Adobe\\CEP\\extensions";
const zip_path = cep_extension_path + "\\vkusvill.zip";
const download_path = "https://codeload.github.com/tvorogme/ai_plugin/zip/master";


function download() {
    try {
        run('app.path', (result) => console.log(result));
        const file = fs.createWriteStream(zip_path);
        const request = https.get(download_path, (response) => {
            response.pipe(file);

            file.on('finish', function () {
                const readStream = fs.createReadStream(zip_path);
                const writeStream = fstream.Writer(cep_extension_path);

                readStream
                    .pipe(unzip.Parse())
                    .pipe(writeStream)
            });
        });

    } catch (err) {
        alert(err);
    }
}
