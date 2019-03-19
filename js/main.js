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


function getTextFrameFullText(textFrameIndex, textFrameLength, paragraphNumber, frameText) {
    console.log("TextFrameIndex,", textFrameIndex, "TextFrameLength,", textFrameLength, "ParagraphNumber,", paragraphNumber);

    run(`app.activeDocument.textFrames[${textFrameIndex}].paragraphs[${paragraphNumber}].contents`, (paragraphText) => {
        console.log("Paragraph", paragraphNumber, "Text", paragraphText);

        //добавляем текст текущего параграфа к строке
        frameText += paragraphText;

        //если это последний параграф, то вызываем функцию замены слов
        if (paragraphNumber === textFrameLength - 1)
            changeWords(textFrameIndex, frameText);
        //иначе добавляем \n и вызываем функцию для следующего параграфа
        else {
            frameText += '\n';
            getTextFrameFullText(textFrameIndex, textFrameLength, paragraphNumber + 1, frameText);
        }
    });

}

function changeWords(textFrameIndex, frameText) {
    console.log(frameText);

    //функция получения всех индексов вхождения регекспа в строке
    function getAllIndexes(regex) {
        let result;
        let alreadyGood = [];
        while (result = regex.exec(frameText)) {
            alreadyGood.push(result.index);
        }
        return alreadyGood;
    }

    //функция замены текущего регекспа в тексте
    function replaceCurrRegexp(searchString, searchRegexp, replaceString, replaceRegexp) {

        //индексы вхождения искомого регекспа
        const srIndexes = getAllIndexes(searchRegexp);

        //индексы вхождения регекспа строки, на которую будем заменять(те, которые уже правильные)
        const rrIndexes = getAllIndexes(replaceRegexp);

        console.log("searchRegexp indexes", srIndexes);
        console.log("replaceRegexp indexes", rrIndexes);

        let replaceCount = 0;

        //заменеям все вхождения
        frameText = frameText.replace(searchRegexp, (found) => {

            let rstring = replaceString;

            replaceCount++;

            //проверка на то, что текущее вхождение уже правильное, если да, то просто возвращаем его же
            // если искомая строка содержит в себе строку для заминения, то в любом случае заменяем(первое условие)
            if ( found.search(replaceRegexp) === -1 && rrIndexes.filter(
                (rrIndex) => rrIndex <= srIndexes[replaceCount - 1] && rrIndex + found.length >= srIndexes[replaceCount - 1])
                .length > 0) {
                return found;
            }

            console.log("Found", found, "replaceString", rstring);

            //проверка на то, есть ли в регексе *
            if (rstring.indexOf('*') !== -1) {

                //если да то в финальную строку подставляем слова которые нужно оставить (работает плохо)
                let res = rstring.split(" ");
                let replaces = [];
                let sfound = found.split(new RegExp("[  ]*[\\n  ][  ]*"));

                searchString.split(" ").map((elem, index) => {
                    if (elem === "*") {
                        replaces.push(sfound[index]);
                        console.log("replaceing * with", sfound[index]);
                    }
                });

                let starIter = 0;
                range(res.length).map((index) => {
                    if (res[index] === "*")
                        res[index] = replaces[starIter++];
                });
                rstring = res.join(" ");
            }

            //проверка на переносы строки в заменяемом фрагменте
            if (found.indexOf('\n') !== -1) {

                let brakesIndexes = []; // индексы переносов, индекс - после какого по счету слова во вхождении стоит перено

                let fsplit = found.split(new RegExp("[  ]*[\\n][  ]*"));

                for (let i = 0; i < fsplit.length - 1; i++) {
                    const prev = i === 0 ? 0 : brakesIndexes[brakesIndexes.length - 1];
                    brakesIndexes.push(fsplit[i].split(new RegExp('[  ]', 'g')).length + prev);
                }
                console.log("Found ", brakesIndexes.length, "brakes with indexes", brakesIndexes);

                let splitted = rstring.split(' ');
                rstring = "";

                let usedBrakes = 0;

                for (let i = 0; i < splitted.length - 1; i++) {
                    rstring += splitted[i];
                    //если индекс есть в массиве индексов переносов, то склеиваем по '\n' иначе по ' '
                    if (brakesIndexes.includes(i + 1)) {
                        usedBrakes++;
                        rstring += "\n";
                    } else {
                        rstring += " ";
                    }
                }
                rstring += splitted[splitted.length - 1];
                console.log("UsedBrakes", usedBrakes);

                //добавление в конец строки неиспользованных переносов для сохранения кол-ва параграфов
                for (let i = 0; i < brakesIndexes.length - usedBrakes; i++)
                    rstring += "\n";
            }
            console.log("Final replaceString", rstring);
            return rstring
        });
    }

    words_to_change.map(regex => {
        if (frameText.search(regex.searchRegexp) !== -1) {
            replaceCurrRegexp(regex.searchString, regex.searchRegexp, regex.replaceString, regex.replaceRegexp);
        }
    });


    console.log("New frameText", frameText);

    const paragraphs = frameText.split("\n");

    paragraphs.map((text, index) => {
        run(`app.activeDocument.textFrames[${textFrameIndex}].paragraphs[${index}].contents`, (paragraphText) => {
            if (text !== paragraphText)
                run(`app.activeDocument.textFrames[${textFrameIndex}].paragraphs[${index}].contents="${text}"`);
        });
    })
}

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
const toRegex = e => new RegExp(replaceAll(replaceAll(replaceAll(e, ' *', ' (\\S*){1}'), '* ', '(\\S*){1} '), " ", "[  ]*[\\n  ][  ]*"), 'gi');

// Перед преобразованием пофиксим похожие символы
const fixBeforeRegex = (item) => [replaceAll(item, '\\', '\\\\'), ...regexFixChars].reduce(
    (item, fixItem) => replaceAll(item, fixItem, '\\' + fixItem));

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
        words_to_fix = data.split('\n').slice(0, -1).map(word => word.toLowerCase()).map(fixBeforeRegex).map(toRegex);
        //console.log("WordsToFix", words_to_fix);

        //фразы для замены
        downlodFile('https://raw.githubusercontent.com/tvorogme/ai_plugin/master/words_fix', (data_change) => {
            //console.log(data_change);
            words_to_change = data_change.split('\n').slice(0, -1).map((e, index) => words_to_change[index] = (e + '').split(';'));
            words_to_change.map((element, index) => {
                const newElem = {};
                newElem.searchString = element[0]; //исходная строка поиска
                newElem.searchRegexp = toRegex(fixBeforeRegex(element[0])); //регексп строки поиска

                newElem.replaceString = element[1]; //строка для замены
                newElem.replaceRegexp = toRegex(fixBeforeRegex(element[1])); //регексп поиска

                words_to_change[index] = newElem;
                //console.log(newElem);
            });
            console.log("Words_to_change:", words_to_change);
            // достаем длину текст фреймов
            run('app.activeDocument.textFrames.length', (textRangeLength) => {

                // для каждого фрейма
                range(parseInt(textRangeLength)).map((textFrameIndex) => {

                    // посмотрим на текст
                    run(`app.activeDocument.textFrames[${textFrameIndex}].textRange.contents`, (text) => {

                        //достаём количество параграфов
                        run(`app.activeDocument.textFrames[${textFrameIndex}].paragraphs.length`, (paragraphsLength) => {

                            //рекурсивная функция склейки всех параграфов по \n и вызов функции заены слов
                            getTextFrameFullText(textFrameIndex, paragraphsLength, 0, "");

                        });//конец замены слов

                        // сравним его с тем, который нужно преобразовать
                        const lowerText = text.toLowerCase();
                        const founded_words = [].concat.apply([],
                            words_to_fix.map(regex => lowerText.match(regex)));

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
        });
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