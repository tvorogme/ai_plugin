const https = require('https');
const fs = require('fs');
const fstream = require('fstream');
const unzip = require('unzip');

const cep_extension_path = "C:\\Program Files (x86)\\Common Files\\Adobe\\CEP\\extensions";
const zip_path = cep_extension_path + "\\vkusvill.zip";
const download_path = "https://codeload.github.com/tvorogme/ai_plugin/zip/master";

const readStream = fs.createReadStream(zip_path);
const writeStream = fstream.Writer(cep_extension_path);

function download() {
    try {
        alert("Обновление в процессе, дождитесь перезагрузки плагина. Если плагин не обновляется - запустите приложение с правами администратора.");
        run('app.path', (result) => console.log(result));
        const file = fs.createWriteStream(zip_path);
        const request = https.get(download_path, (response) => {
            response.pipe(file);

            file.on('finish', function () {
                readStream.pipe(unzip.Parse()).pipe(writeStream);

                alert("Успешно обновили");
                new CSInterface().requestOpenExtension('com.adobe.vkusvill.extension');
            });
        });

    } catch (err) {
        alert(err);
    }
}
