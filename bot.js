// jshint esversion: 8
const venom = require("venom-bot");
const _ = require("lodash");
const fs = require("fs");
const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();


mongoose.connect("mongodb://localhost:27017/whatsappBot", { useNewUrlParser: true, useUnifiedTopology: true });
const userSchema = new mongoose.Schema({
  noID: String,
  name: String,
  adult: Boolean,
  score: Number,
});
const quizSchema = new mongoose.Schema({
  _id: Number,
  question: String,
  answers: Array,
});

const Ques = mongoose.model("question", quizSchema);
const User = mongoose.model("user", userSchema);
Ques.deleteMany({}, function () {
  console.log("questions db cleared");
});
let makeStickerTries = 0;
let gifStickerTry = 0;

// let lookingForAnswer = false;

// Variables:
let preprocessor = ".";
let autoResponseEnabled = true;
let myPhonNumber = "";

venom
  .create()
  .then((client) => start(client))
  .catch((erro) => {
    console.log(erro);
  });

function start(client) {
  client.onMessage((message) => {
    createOrFindUser(message);

    if (
      message.quotedParticipant === myPhonNumber + "@c.us" &&
      ["a", "b", "c", "d", "e", "f"].includes(_.toLower(message.body))
    ) {
      checkAnswerToQuiz(client, message);
    }
    message.body = _.toLower(message.body);
    if (autoResponseEnabled) {
      autoResponse(client, message);
    }

    if (message.body.slice(0, 1) === preprocessor) {
      // console.log(recvMsg.chat.name)
      let commands = message.body.slice(1).split(" ");

      pre = commands[0];
      attr = commands[1];
      query = splitAtFirstSpace(message.body.slice(1))[1];
      switch (pre) {
        case "sticker":
          sendGifAsSticker(client, message, query);
          break;
        case "gimme":
          sendReddit(client, message, query);
          break;
        case "quiz":
          quiz(client, message);
          break;
        case "score":
          getScore(client, message);
          break;
        case "rank":
          getRank(client, message);
          break;
        case "make":
          if (Math.floor(Math.random() * 2)) {
            makeSticker(client, message, query);
          } else {
            makeGif(client, message, query);
          }

          break;

        case "help":
          sendHelp(client, message);
          break;
        default:
      }
    }
  });
}

function splitAtFirstSpace(str) {
  if (!str) return [];
  var i = str.indexOf(" ");
  if (i > 0) {
    return [str.substring(0, i), str.substring(i + 1)];
  } else return [str];
}

function sendReply(client, recvMsg, sentMsg) {
  client.reply(recvMsg.from, sentMsg, recvMsg.id).catch((erro) => {
    console.error("Error when sending: ", erro); //return object error
  });
}

function sendText(client, recvMsg, sentMsg) {
  console.log("Trying to send message");
  client.sendText(recvMsg.from, sentMsg).catch((erro) => {
    console.error("Error when sending: ", erro); //return object error
  });
}

function createOrFindUser(userInfo) {
  User.findOne({ noID: userInfo.sender.id }, function (err, foundUser) {
    if (err) {
      console.log(err);
    } else {
      if (!foundUser) {
        console.log("Creating new user: " + userInfo.sender.pushname);
        let person = new User({
          noID: userInfo.sender.id,
          name: userInfo.sender.pushname,
          adult: false,
          score: 0,
        });
        person.save();
      } else {
      }
    }
  });
}

function sendFile(client, message, file, caption) {
  if (caption === undefined) {
    caption = "";
  }
  client
    .sendFile(message.from, file, "file_name", caption)
    .then((result) => {
      console.log("Result: ", result); //return object success
    })
    .catch((erro) => {
      console.error("Error when sending: ", erro); //return object error
    });
}

function sendGifAsSticker(client, recvMsg, query) {
  gifStickerTry += 1;
  if (attr === undefined) {
    attr = "What you want";
  }
  console.log(attr);
  axios
    .get("https://api.giphy.com/v1/stickers/search", { params: { api_key: process.env.GIPHYKEY, q: query } })
    .then((response) => {
      let rand = Math.floor(Math.random() * response.data.data.length);
      let gif = response.data.data[rand];
      let gifurl = gif.images.original.url;
      client
        .sendImageAsStickerGif(recvMsg.from, gifurl)
        .then((result) => {
          console.log("Result: ", result); //return object success
          gifStickerTry = 0;
        })
        .catch((erro) => {
          console.error(", Trying again, Error when sending: ", erro); //return object error
          if (gifStickerTry < 3) {
            sendGifAsSticker(client, recvMsg, query);
          }
        });
    });
}

function makeGif(client, recvMsg, query) {
  makeStickerTries += 1;
  let howWeird = Math.floor(Math.random() * 11);

  axios
    .get("https://api.giphy.com/v1/gifs/translate", {
      params: { api_key: process.env.GIPHYKEY, s: query, weirdness: howWeird },
    })
    .then((response) => {
      if (response.status === 200) {
        try {
          let gifurl = response.data.data.images.original.mp4;
          console.log(gifurl);
          client
            .sendFile(recvMsg.from, gifurl)
            .then((result) => {
              console.log("Result: ", result); //return object success
              makeStickerTries = 0;
            })
            .catch((erro) => {
              console.error(", Trying again, Error when sending: ", erro); //return object error
              if (makeStickerTries < 3) {
                makeGif(client, recvMsg, query);
              }
            });
        } catch (err) {
          console.log(err);
        }
      }
    });
}
function makeSticker(client, recvMsg, query) {
  makeStickerTries += 1;
  let howWeird = Math.floor(Math.random() * 11);

  axios
    .get("https://api.giphy.com/v1/gifs/translate", {
      params: { api_key: process.env.GIPHYKEY, s: query, weirdness: howWeird },
    })
    .then((response) => {
      if (response.status === 200) {
        let gifurl = response.data.data.images.fixed_height_downsampled.url;
        console.log(gifurl);
        client
          .sendImageAsStickerGif(recvMsg.from, gifurl)
          .then((result) => {
            console.log("Result: ", result); //return object success
            makeStickerTries = 0;
          })
          .catch((erro) => {
            console.error(", Trying again, Error when sending: ", erro); //return object error
            if (makeStickerTries < 3) {
              makeSticker(client, recvMsg, query);
            }
          });
      }
    });
}

function sendImage(client, recvMsg, sentMsg, caption) {
  console.log("sendding image");
  if (caption === undefined) {
    caption = "";
  }
  client
    .sendImage(recvMsg.from, sentMsg, "image", caption)
    .then((result) => {
      console.log("Result: ", result); //return object success
    })
    .catch((erro) => {
      console.error("Error when sending: ", erro); //return object error
    });
}

function sendImageAsSticker(client, recvcMsg, img) {
  client
    .sendImageAsSticker(recvcMsg.from, img)
    .then((result) => {
      console.log("Result: ", result); //return object success
    })
    .catch((erro) => {
      console.error("Error when sending: ", erro); //return object error
    });
}

function sendGiphy(client, message, query) {
  axios
    .get("https://api.giphy.com/v1/gifs/search", { params: { api_key: process.env.GIPHYKEY, q: query } })
    .then((response) => {
      let rand = Math.floor(Math.random() * response.data.data.length);
      let gif = response.data.data[rand];
      let gifVidUrl = gif.images.original.mp4;
      sendFile(client, message, gifVidUrl);
    })
    .catch((error) => {
      console.log(error);
    });
}

function sendReddit(client, recvMsg, query) {
  axios
    .get("https://meme-api.herokuapp.com/gimme/" + _.camelCase(query))
    .then((response) => {
      if (response.status === 200) {
        console.log(response.status + "page loaded");
        let json = response.data;

        let title = json.title;
        let img = json.url;
        if (json.nsfw) {
          sendGiphy(client, recvMsg, query);
        } else {
          if (json.ups > 100) {
            console.log("good subreddit found");
            sendImage(client, recvMsg, img, title);
          } else {
            console.log("redirecting to giphy");
            sendGiphy(client, recvMsg, query);
          }
        }
      } else {
        console.log(response.status);
      }
    })
    .catch((e) => {
      console.log(e);
      console.log("redirecting to giphy");
      sendGiphy(client, recvMsg, query);
    });
}

function quiz(client, message) {
  let categories = ["linux", "bash", "docker", "sql"];
  axios
    .get("https://quizapi.io/api/v1/questions", { params: { apiKey: process.env.QUIZAPI, limit: 1 } })
    .then((response) => {
      console.log(response.data);
      let id = response.data[0].id;
      let question = response.data[0].question;
      let options = "";
      Object.entries(response.data[0].answers).forEach(([key, value]) => {
        if (value) {
          options = options + key.split("_")[1] + ": " + value + "\n";
        }
      });
      let correctAnswers = [];

      let ans = Object.entries(response.data[0].correct_answers).forEach(([key, value]) => {
        if (value === "true") {
          correctAnswers.push(key.split("_")[1]);
        }
      });

      let sendQuestion = "/" + id + "/\n\n Q: " + question + "\n\n" + options;

      let ques = new Ques({
        _id: id,
        question: question,
        answers: correctAnswers,
      });
      ques.save();

      sendText(client, message, sendQuestion);
    })
    .catch((err) => {
      console.log(err);
    });
}

function checkAnswerToQuiz(client, message) {
  let user;
  if (message.isGroupMsg) {
    user = message.author;
  } else {
    user = message.from;
  }
  let id = parseInt(message.quotedMsg.body.split("/")[1]);
  console.log("Looking for ques: " + id);
  let inputAns = _.toLower(message.body);
  Ques.findOne({ _id: id }, function (err, foundQues) {
    if (!err && foundQues) {
      if (foundQues.answers.includes(inputAns)) {
        sendReply(client, message, "Good Work, you got 10 points");
        gainPoints(user, 10);
        Ques.deleteOne({ _id: id }, function (err) {
          console.log(err);
        });
        // lookingForAnswer = false;
      } else {
        sendReply(client, message, "Ow, You lost 3 points, try again!");
        gainPoints(user, -3);
        console.log(inputAns + foundQues.answers);
      }
    } else {
      console.log(err);
    }
  });
}

function gainPoints(user, points) {
  User.findOne({ noID: user }, function (err, foundUser) {
    if (!err) {
      console.log(foundUser);

      let newScore;

      newScore = foundUser.score + points;

      console.log("updating score");

      User.findOneAndUpdate({ noID: user }, { $set: { score: newScore } }, function (e) {
        console.log(e);
      });
    } else {
      console.log("err: " + err);
    }
  });
}

function getScore(client, message) {
  console.log(message);
  let user;
  if (message.isGroupMsg) {
    user = message.author;
  } else {
    user = message.from;
  }
  User.findOne({ noID: user }, function (err, foundUser) {
    sendReply(client, message, "Your current score is " + foundUser.score);
  });
}

function getRank(client, message) {
  User.find({})
    .sort("-score")
    .exec(function (err, docs) {
      let topFive = "";
      for (let i = 0; i < 5; i++) {
        topFive += docs[i].name + ": " + docs[i].score + "\n";
      }
      sendText(client, message, topFive);
    });
}

function sendHelp(client, user) {
  console.log("sending help");
  let help = `${preprocessor}gimme <search>*: Sends a relatable image from a matching subreddit. Example: ${preprocessor}gimme PuppySmiles\n\n*${preprocessor}sticker <search>*: Sends a relatble sticker. Example: ${preprocessor}sticker Thank You\n\n*${preprocessor}make <name>*: Sends a gif or sticker generated by matching the query. Example: .make ryan gosling`;

  sendText(client, user, help);
}

String.prototype.shuffle = function () {
  var a = this.split(""),
    n = a.length;

  for (var i = n - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a.join("");
};
