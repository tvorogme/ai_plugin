const https = require('https');
const fs = require('fs');
const fstream = require('fstream');
const StreamZip = require('node-stream-zip');

const cep_extension_path = "C:\\Program Files (x86)\\Common Files\\Adobe\\CEP\\extensions";
const zip_path = cep_extension_path + "\\vkusvill.zip";
const download_path = "https://codeload.github.com/tvorogme/ai_plugin/zip/master";

const writeStream = fstream.Writer(cep_extension_path);

function download() {
    try {
        alert("Обновление в процессе, дождитесь перезагрузки плагина. Если плагин не обновляется - запустите приложение с правами администратора. Время обновления до 1 минуты.");
        run('app.path', (result) => console.log(result));
        const file = fs.createWriteStream(zip_path);
        const request = https.get(download_path, (response) => {
            response.pipe(file);

            file.on('finish', function () {
                const zip = new StreamZip({
                    file: zip_path
                });

                // Handle errors
                zip.on('error', err => {
                    alert(err)
                });

                zip.on('ready', () => {
                    zip.extract(null, cep_extension_path, (err, count) => {
                        err ? alert('Extract error') : console.log(`Extracted ${count} entries`);
                        zip.close();
                        !err ? alert("Успешно обновили") : null;
                    });
                });


                new CSInterface().requestOpenExtension('com.adobe.vkusvill.extension');
            });
        });

    } catch (err) {
        alert(err);
    }
}
