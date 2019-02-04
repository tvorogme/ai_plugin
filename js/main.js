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

const words_to_fix = ['масса нетто', 'срок годности', 'масса нетто:', 'срок годности:', 'объем', 'объём', 'объем:', 'объём:'];

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

function fixFonts(e) {

    // достаем длину текст фреймов
    run('app.activeDocument.textFrames.length', (textRangeLength) => {

        // для каждого фрейма
        range(parseInt(textRangeLength)).map((textFrameIndex) => {

            // посмотрим на текст
            run(`app.activeDocument.textFrames[${textFrameIndex}].textRange.contents`, (text) => {
                // сравним его с тем, который нужно преобразовать
                const lowerText = text.toLowerCase();

                // для каждого слова
                words_to_fix.map((textToFix) => {

                    // если оно есть в тексте
                    if (lowerText.indexOf(textToFix) !== -1) {

                        // пофиксим основное слово
                        mapOverChars(textFrameIndex, textToFix.length, lowerText.indexOf(textToFix));

                        // Найдем где заканчивается последнее слово
                        const main_word_end = lowerText.indexOf(textToFix) + textToFix.length;

                        // Найдем где заканчивается предложение
                        const text_end_on = lowerText.slice(
                            lowerText.indexOf(textToFix) + textToFix.length).indexOf('.');

                        // пофиксим все слова после основного слова
                        mapOverChars(textFrameIndex,  text_end_on + 1, main_word_end)

                    }
                });

                document.getElementById('status').innerHTML = 'Успешно';

                setTimeout(() => document.getElementById('status').innerHTML = 'Все хорошо', 3000)
            });

        })
    });
}