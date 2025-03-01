
const fs = require("fs");
const {PARSER} = require("../index.js");
let strPath = ".\\demo\\";

let strXML = fs.readFileSync(strPath + "define_9.xml", "utf8");

let data = PARSER.parse(strXML);

// console.log(parser);

let jsonFile = JSON.stringify(data);
// let jsonFile=parsedefxml.parseStructure(xmlFile);
fs.writeFileSync(strPath + "\\test.json", jsonFile, (err) => {
  if (err) {
    console.log(err);
  }
});