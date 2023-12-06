///////////////////SETUP//////////////////////
// Import necessary modules
const { Client , LocalAuth, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const OpenAI = require("openai");
require('dotenv').config();
const path = require('path');
const sentMessages = new Map();

// Path where the session data will be stored
const SESSION_FILE_PATH = './session.json';

// Load the session data if it has been previously saved
let sessionData;
if(fs.existsSync(SESSION_FILE_PATH)) {
    sessionData = require(SESSION_FILE_PATH);
}

// Use the saved values
const client = new Client({
    session: sessionData,
    puppeteer: {
  headless: true,
  args: ['--no-sandbox','--disable-setuid-sandbox'],},
    authStrategy: new LocalAuth(),
});

// Create a new OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // This is also the default, can be omitted
});

// Show QR code for authentication
client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
});

// Initialize client
client.initialize();

// Confirm client is ready
client.on('ready', () => {
  console.log('Client is ready!');
});

// Reconnect on disconnection
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

function reconnectClient() {
  if (reconnectAttempts < maxReconnectAttempts) {
    console.log('Attempting to reconnect...');
    client.initialize();
    reconnectAttempts++;
  } else {
    console.log(`Failed to reconnect after ${maxReconnectAttempts} attempts. Exiting...`);
    process.exit(1);
  }
}

client.on('disconnected', (reason) => {
  console.log('Client disconnected: ' + reason);
  reconnectClient();
});

// Event triggered when the client is ready
client.on('ready', async () => {
  // Set the bot's state as "online"
  await client.sendPresenceAvailable();
});

///////////////////SCRIPT/////////////////////////
let userStep = 0;
const prompt = 'Help me learn Russian. Make sentences with blanks and the words in English that I will need to translate and modify the word to fit in the sentences like in the example. Keep the created sentences strictly with the words listed below and concepts listed. Do not give me answers or full translations with the questions. Just give me 10 questions and no other explanations. Have an emphasis on accusative, verbs of motion, prepositional, question words, plurals, ordinal numbers, adjectives in nominative or accusative. Do not use any dative, instrumental or genitive. Use the following concepts in your questions:\n\n-Conjugating verbs;\n-Forming plurals for nouns;\n-Matching genders and case for adjectives and possessive pronouns;\n-Numbers and ordinal numbers up to number 20;\n-Basic forms of prepositional в and на;\n-Contrast а and но;\n-Emphasis on Accusative nouns and adjectives;\n \n\n Sentences example:\n “Questions\n 1. Он и она́ _______. (at home)\n 2. Тут карта и _______. (Whiteboard)\n 3. Вот ________. Он _________. (military student), (sailor)\n 4. – _____ это? – Э́то _______. (Who), (soldier)\n 5. Это _________. Тут _______. (classroom), (lesson)\n 6. – Кто это? – Это Анна. Она ___________. (military student)\n 7. Вот _________. Тут ______, а там _______. (room), (table), (chair)\n 8. – Иван дома? – ____. Он дома. (Yes)\n 9. ____ тут, а ______ там. (He), (she)\n 10. – Кто ______? – _____ Анна Ивановна. (there), (This is)\n 11. – ________ тут? – Да, тут. (House)\n 12. Там _______, а тут ________. (window), (screen).\n\n Answer Key\n Он и она́ дома.\n 2. Тут карта и доска.\n 3. Вот курсант. Он матрос.\n 4. – Кто это? – Э ́ то солдат.\n 5. Э ́ то класс. Тут урок.\n 6. – Кто это? – Это Анна. Она́ курсантка.\n 7. Вот комната. Тут стол, а там стул.\n 8. – Иван дома? – Да. Он дома.\n 9. Он тут, а она там.\n 10. – Кто там? – Это Анна Ивановна.\n 11. – Дом тут? – Да, тут.\n 12. Там окно, а тут экран."\n\nWord list:\n“а; американский; английский; аптека; бабушка; белый; библиотека; близко; больница; большой; брат, братья; буква; бумага; был, была, были, были; в(во); ваш, ваша, ваше; ваши; ветер; вечер, вечера́; вечером; водитель; восемь; восьмой; все; всё; второй; вчера́; вы; газета; гараж, гаражи́; где; генерал; гора, горы; город, города́; господин, господа; госпожа; госпиталь; гражданка; гражданин, граждане; да; далеко́; два, две; двор; девочка; девушка; девятый; девять; дедушка; день, дни; деньги; деревня; десятый; десять; диван; днём; До свидания.; Доброе утро!; Добрый день!; Добрый вечер!; дождь; доктор; дом; дома; дорога; доска́; дочь, дочери; друг, друзья́; дядя; его́; её; ефрейтор; eщи; жена, жёны; жить; журнал; завод; завтра; здание, здания; здесь; Здравствуйте!; и; или; имя, имена; имя-отчество; инженер; институт; их; кажется; казарма; Как(ваш, твой)отец?; Как(ваши, твои́)дела́?; Как ваша фамилия?; Как ваше имя-отчество?; Как вас зовут?; Как вы поживаете?; Как оба что.; какой; Какой ваша адрес?; Какое ваше звание?; капитан; капрал; карандаш; карта; квартира; кино́; кинотеатр; класс; клуб; ключ; книга; когда́; кольцо, кольца; командир; комната; конечно; красивый; красный; кто; курсант; курсантка; лейтенант; лётчик; мама; магазин́; майор; маленький; мальчик; матрос; мать, матери; машина; медбрат; медсестра; Меня зовут...; механик; мои́; мой, моя́, моё; молодой человек; молодой; морфеях; муж, мужья́; мы; наши; на; на улице; наверно/наверное; наш, наша, наше; не; недалеко; Неплохо.; нет; но; новый; номер; Нормальна.; ночь; ночью; нуль, ноль; оба что; один, одна, одно; окно́; он; оно; она́; они́; отец отцы; отчество; офицер; очень; Очень приятно.; очки; папа; папка; парень, парни; первый; письмо, письма; плохой; пагода; подполковник; подруга; Пожалуйста.; позавчера́; Познакомьтесь, пожалуйста.; Пока́!; Поле, поля́; поликлиника; полковник; полка; послезавтра; почта; правда; правильно; преподаватель; преподавательница; Привет!; Простоте!; просто; прямо; пятый; пять; работа; работать; ребёнок, дети; родителе; Российский; русский; ручка; рядовой; рядом; самолёт; сегодня; седьмой; сейчас; семь; семья́, семьи; сержант; сестра, сёстры; синий; Скажите, пожалуйста...; слева; слово, слова; словарь, словари́; снег; солдат; солнечный; Спасибо, хорошо́; Спасибо.; справа; старый; стена; стол; студент; студентка; стул; Счастливое!; Сын, сыновья́; Так себе.; там; твои́; твой, твоя́, твоё; театр; ; тётя; товарищ; тоже; тот, та, то, те; третий; три; туман; тут; ты; Увидимся!; уже́; улица; урок; утро; утром; учебник; учитель, учителя́; учительница; хороший; часы́; чей? чья? чьё? чьи?; Человек, люди; четвёртый; четыре; чёрный; что; шестой; шесть; школа; штаб; экран; это; этот, эта, это, эти; я; ясный; американец; американка; американцы; англичане; англичанин; англичанка; ботинки; браки; быстро; в первый раз; вас; вещь; видеть; военный; вопрос; восемнадцатый; восемнадцать; воскресенье; Всего хорошего!; встреча; вторник; Вы(не)знаете...?Ты(не)знаешь...?; галстук; говорить; голубей; двадцатый; двадцать; двенадцатый; двенадцать; девятнадцатый; девятнадцать; делать; дешёвый; До завтра!; домашняя работа; делать домашнюю работу; домой; дорогой; его́, её; жёлтый; зелёный; знать; изучать; иностранный; интересный; испанец; испанка; испанский; испанцы; их; как; Как по-русски...?; Какого цвета?; кого гречневый; Костю ́м; кроссовки; куда курить; лёгкий; легко мало; медленно; меня младший; младший брат/младшая сестра; много; можно; Можно задать вопрос?; нас; нельзя; немец; немецкий; немка; немного; немцы; обувь; одежда; одиннадцатый; одиннадцать; ответ; отвечать; отвечать на вопрос; отдел; ошибка; пальто; пиджак; писать; платье; плохо; по-испански; Покажите(пожалуйста)…; покупать; купил, купила, купили; понедельник; по-немецки; понимать; по-русски; потому что; по-французски; почему поэтому; предложение; продавать; пятнадцатый; пятнадцать; пятница; разговор; размер; разный; рассказ; россияне; россиянин; россиянка; рубашка; русская; русские; русский; сапоги семнадцатый; семнадцать; серый; слушать; советский; спрашивать; среда старший; старший брат/старшая сестра́ статья́ страница; суббота; сюда́; так; тебя только; тринадцатый; тринадцать; трудно; трудный; туда́; туфли; У вас есть...?; У меня́ есть.../У нас есть...; упражнение; учить; француженка; француз; французский; французы; футболка; хорошо́; цвет, цвета́; четверг; четырнадцатый; четырнадцать; читать; Что значит...?; шапка; шестнадцатый; шестнадцать; экзамен; юбок; Я хочу купить...; язык”\n';
function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

client.on('message', async message => {
  const chat = await message.getChat();
  if (userStep === 0 && message.body === "#russian") {
    await chat.sendStateTyping();
    console.log (prompt);
    client.sendMessage(message.from, '_Generating questions..._');
    const response = await main(prompt);
    client.sendMessage(message.from, response + '\n\n*Reply to this message with your answers.*');
  }
  if (message.hasQuotedMsg) {
      await chat.sendStateTyping();
      const quotedMessage = await message.getQuotedMessage();
      //const reply = await message.getChat();;
      let answers = 'This was the original prompt:\n' + prompt + '\n\nThese were the questions:\n' + quotedMessage.body + '\n\nThese were the users answers:' +  message.body + '\nMake corrections, give feedback and score my answers by displaying the sentence with my original answer, next to it a parethesis with if its correct or not, if its incorrect the correct word and a bried explanation of why, and at the end a score. Bold my answer (bold works like this *word*) and the correct answer. If the reply doesnt fit the logic of the questions or is left blank let the user know instead of scoring something random or blank.';
      console.log(answers);
      client.sendMessage(message.from, "_Scoring..._");
      const response = await main2(answers);
      client.sendMessage(message.from, response);
  }    
});

async function main() {
    const completion = await openai.chat.completions.create({
    messages: [{"role": "system", "content": "You are a teaching me Russian. Help me learn Russian. Make sentences with blanks and the words in English that I will need to translate and modify the word to fit in the sentences like in the example. Keep the created sentences strictly with the words listed below and concepts listed. Do not give me answers or full translations with the questions. Just give me 10 questions and no other explanations. Have an emphasis on accusative, verbs of motion, prepositional, question words, plurals, ordinal numbers, adjectives in nominative or accusative. Do not use any dative, instrumental or genitive. Use the following concepts in your questions:\n\n-Conjugating verbs;\n-Forming plurals for nouns;\n-Matching genders and case for adjectives and possessive pronouns;"},
    {"role": "user", "content": prompt}],
    model: "gpt-4",
    });
    return completion.choices[0].message.content;
  }
  async function main2(answers) {
    const completion = await openai.chat.completions.create({
        messages: [
            {"role": "system", "content": "You are a teaching me Russian."},
            {"role": "user", "content": answers}
        ],
        model: "gpt-4",
    });
    return completion.choices[0].message.content;
}
