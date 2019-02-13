const https = require('https');
const range = (start, stop, step) => {
    if (typeof stop == 'undefined') {
        // one param defined
        stop = start;
        start = 0;
    }

    if (typeof step == 'undefined') {
        step = 1;
    }

    if ((step > 0 && start >= stop) || (step < 0 && start <= stop)) {
        return [];
    }

    var result = [];
    for (var i = start; step > 0 ? i < stop : i > stop; i += step) {
        result.push(i);
    }

    return result;
};

// Скачать файл по ссылке
const downlodFile = (url, func) => {
    https.get(url).on('response', (response) => {
        let body = '';

        response.on('data', (chunk) => {
            body += chunk;
        });
        response.on('end', () => func(body));
    });
};

// Символы, которые нужно заменить в Regexp
const regexFixChars = ['.', '^', '$', '+', '-', '?', '(', ')', '[', ']', '{', '}', '|'];

// Заменить все вхождения в строке
const replaceAll = (item, search, replace) => item.split(search).join(replace);

// Преобразовать в регекс
const toRegex = e => new RegExp(replaceAll(replaceAll(e, ' *', ' (\\S*){1}'), '* ', '(\\S*){1} '), 'g');

// Перед преобразованием пофиксим похожие символы
const fixBeforeRegex = (item) => [replaceAll(item, '\\', '\\\\'), ...regexFixChars].reduce(
    (item, fixItem) => replaceAll(item, fixItem));

const words_to_replace = {'lol': 'kek'};
const words_to_replace_keys = Object.keys(words_to_replace).map(fixBeforeRegex).map(toRegex);

function mapOverChars(textFrameIndex, toFixLength, charIndex, toUpper = true) {
    const textFrameTemplate = `app.activeDocument.textFrames[${textFrameIndex}].textRange`;

    // посмотрим сколько всего слов
    range(charIndex, charIndex + toFixLength).map((index) => {
        // пофиксим размер текста
        run(textFrameTemplate + `.characters[${index}].size = 8`);

        // если нужно установим капсом
        toUpper ? run(textFrameTemplate + `.characters[${index}].changeCaseTo(CaseChangeType.UPPERCASE)`) : null;
    });


    return true
}

let words_to_fix = [];

let words_to_change = [];

function fixFonts(e) {
    downlodFile('https://raw.githubusercontent.com/tvorogme/ai_plugin/master/font_fix', (data) => {
        words_to_fix = data.split('\n').slice(0, -1).map(fixBeforeRegex).map(toRegex);
    });

    downlodFile('https://raw.githubusercontent.com/tvorogme/ai_plugin/master/words_fix', (data) => {
        words_to_change = data.split('\n').slice(0, -1).map((e, index) => words_to_change[index] = (e + '').split(';'));
        words_to_change.map((element, index) => {
            words_to_change[index].push(element[0].length);
            words_to_change[index][0] = toRegex(fixBeforeRegex(element[0]));
            words_to_change[index][1] = element[1];

        })
    });


    // достаем длину текст фреймов
    run('app.activeDocument.textFrames.length', (textRangeLength) => {

        // для каждого фрейма
        range(parseInt(textRangeLength)).map((textFrameIndex) => {

            // посмотрим на текст
            run(`app.activeDocument.textFrames[${textFrameIndex}].textRange.contents`, (text) => {

                // сравним его с тем, который нужно преобразовать
                const lowerText = text.toLowerCase();

                const founded_words = [].concat.apply([],
                    words_to_fix.map(regex => lowerText.match(regex)));

                words_to_change.map((regex)  => {
                    const index = lowerText.search(regex[0]);
                    console.log("text", lowerText);
                    console.log("regex", regex);
                    console.log(index);
                    if(index !== -1)
                    {
                        console.log("regex", regex);
                        console.log("new text", text.slice(0, index) + regex[1] + text.slice(index+regex[2], text.length));
                        //console.log("string, ", `app.activeDocument.textFrames[${textFrameIndex}].textRange.contents="${text.replace(regex[0], regex[1])}"`);
                        run(`app.activeDocument.textFrames[${textFrameIndex}].textRange.contents="${text.slice(0, index) + regex[1] + text.slice(index+regex[2], text.length)}"`);
                    }
                });

                // для каждого слова
                founded_words.map((textToFix) => {

                    // если оно есть в тексте
                    if (lowerText.indexOf(textToFix) !== -1) {

                        // пофиксим основное слово
                        mapOverChars(textFrameIndex, textToFix.length, lowerText.indexOf(textToFix));

                        // // Найдем где заканчивается последнее слово
                        // const main_word_end = lowerText.indexOf(textToFix) + textToFix.length;
                        //
                        // // Найдем где заканчивается предложение
                        // const text_end_on = lowerText.slice(
                        //     lowerText.indexOf(textToFix) + textToFix.length).indexOf('.');
                        //
                        // // пофиксим все слова после основного слова
                        // mapOverChars(textFrameIndex, text_end_on + 1, main_word_end)
                    }
                });

                // const founded_words_to_replace = [].concat.apply([],
                //     words_to_replace_keys.map(regex => lowerText.match(regex)));
                //
                // // для каждого слова
                // founded_words_to_replace.map((textToReplace) => {
                //
                //     // если оно есть в тексте
                //     if (lowerText.indexOf(textToReplace) !== -1) {
                //
                //         // пофиксим основное слово
                //         mapOverChars(textFrameIndex, textToFix.length, lowerText.indexOf(textToFix));
                //
                //     }
                // });

                document.getElementById('status').innerHTML = 'Успешно';

                setTimeout(() => document.getElementById('status').innerHTML = 'Все хорошо', 3000)
            });

        })
    });
}

//
// let founded = false;
//
// function stopCheck() {
//     founded = true;
//     document.getElementById('status').innerHTML = '100% Magenta';
// }
//
// function checkForMagenta() {
//     founded = false;
//     document.getElementById('status').innerHTML = 'Начал проверку';
//
//     // достаем длину текст фреймов
//     run('app.activeDocument.textFrames.length', (textRangeLength) => {
//
//         // для каждого фрейма
//         range(parseInt(textRangeLength)).map((textFrameIndex) => {
//
//             // посмотрим на текст
//             run(`app.activeDocument.textFrames[${textFrameIndex}].textRange.length`, (charsLength) => {
//                 range(parseInt(charsLength)).map((charIndex) => {
//
//                     if (!founded) {
//                         const curColor = `app.activeDocument.textFrames[${textFrameIndex}].characters[${charIndex}].characterAttributes.fillColor`;
//
//                         run(curColor, (color) => {
//                             run(curColor + '.black', (e) => {
//                                 e !== 'undefined' ?
//                                     parseInt(e) === 0 ? run(curColor + '.cyan', (e) => e !== 'undefined' ?
//                                         parseInt(e) === 0 ? run(curColor + '.yellow', (e) => e !== 'undefined' ? parseInt(e) === 0 ?
//                                             run(curColor + '.magenta', (e) => e !== 'undefined' ?
//                                                 parseInt(e) === 100 ? stopCheck() : null : null)
//                                             : null
//                                             : null)
//                                             : null
//                                         : null) :
//                                         null :
//                                     null
//                             });
//                         });
//                     }
//                 })
//             })
//         })
//     });
//
//     setTimeout(() => document.getElementById('status').innerHTML = 'Все хорошо', 1000)
// }