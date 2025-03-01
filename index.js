var DOMNodeTypes = {
  ELEMENT_NODE: 1,
  TEXT_NODE: 3,
  CDATA_SECTION_NODE: 4,
  COMMENT_NODE: 8,
  DOCUMENT_NODE: 9,
};
class PARSER {
  constructor() {
    this.xml = null;
    this.dataset = {};
    this.variable = {};
    this.method = {};
  }
  parse(input) {
    this.xml = this.string2xml(input);
    // this.parseXml();
    this.parseXml();
    console.log(this);
    return this.parseData();
    // return this.xml;
  }
  static parse(input) {
    return new this().parse(input);
  }
}

let pp = PARSER.prototype;

pp.getNodeLocalName = function (node) {
  let nodeLocalName = node.localName;
  if (nodeLocalName == null)
    // Yeah, this is IE!!
    nodeLocalName = node.baseName;
  if (nodeLocalName == null || nodeLocalName == "")
    // =="" is IE too
    nodeLocalName = node.nodeName;
  return nodeLocalName;
};
pp.string2xml = function (xmlDocStr) {
  let xmlDoc;
  // console.log(typeof window !== "undefined");
  if (typeof window !== "undefined") {
    let isIEParser = window.ActiveXObject || "ActiveXObject" in window;
    if (xmlDocStr === undefined) {
      return null;
    }

    if (window.DOMParser) {
      let parser = new window.DOMParser();
      let parsererrorNS = null;
      // IE9+ now is here
      if (!isIEParser) {
        try {
          parsererrorNS = parser
            .parseFromString("INVALID", "text/xml")
            .getElementsByTagName("parsererror")[0].namespaceURI;
        } catch (err) {
          parsererrorNS = null;
        }
      }
      try {
        xmlDoc = parser.parseFromString(xmlDocStr, "text/xml");
        if (
          parsererrorNS != null &&
          xmlDoc.getElementsByTagNameNS(parsererrorNS, "parsererror").length > 0
        ) {
          //throw new Error('Error parsing XML: '+xmlDocStr);
          xmlDoc = null;
        }
      } catch (err) {
        xmlDoc = null;
      }
    } else {
      // IE :(
      /* eslint-disable */
      if (xmlDocStr.indexOf("<?") == 0) {
        xmlDocStr = xmlDocStr.substr(xmlDocStr.indexOf("?>") + 2);
      }
      xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
      xmlDoc.async = "false";
      xmlDoc.loadXML(xmlDocStr);
      /* eslint-enable */
    }
  } else {
    const { DOMParser } = require("@xmldom/xmldom");
    const dom_parser = new DOMParser();
    // console.log(xmlDocStr);
    xmlDoc = dom_parser.parseFromString(xmlDocStr, "text/xml");
    // console.log(xmlDoc.nodeType);
  }
  return xmlDoc;
};

pp.parseXml = function (xmlDoc) {
  if (!xmlDoc) xmlDoc = this.xml;
  if (xmlDoc.nodeType == DOMNodeTypes.DOCUMENT_NODE) {
    let nodeChildren = xmlDoc.childNodes;

    for (let cidx = 0; cidx < nodeChildren.length; cidx++) {
      let child = nodeChildren.item(cidx);
      if (child.nodeType == DOMNodeTypes.ELEMENT_NODE) {
        this.parseElement(child);
      }
    }
  } else {
    console.log(xmlDoc.nodeType);
  }
};
pp.parseElement = function (xmlNode) {
  let xmlStudy = xmlNode.getElementsByTagName("Study")[0];
  xmlMetaDataVersion = xmlStudy.getElementsByTagName("MetaDataVersion")[0];
  let nodeChildren = xmlMetaDataVersion.childNodes;
  for (let cidx = 0; cidx < nodeChildren.length; cidx++) {
    let child = nodeChildren.item(cidx);
    if (child.nodeType == DOMNodeTypes.ELEMENT_NODE) {
      // console.log(getNodeLocalName(child));
      let strNodeName = this.getNodeLocalName(child);
      switch (strNodeName) {
        case "ItemGroupDef":
          this.parseDataset(child);
          break;
        case "ItemDef":
          this.parseVariable(child);
          break;
        case "MethodDef":
          this.parseMethod(child);
          break;
        default:
          break;
      }
    }
  }
};
pp.parseDataset = function (xmlNode) {
  let arrAttribute = xmlNode.attributes;
  let xmlItemRefs = xmlNode.getElementsByTagName("ItemRef");
  let value = {};
  for (let aidx = 0; aidx < arrAttribute.length; aidx++) {
    let attr = arrAttribute.item(aidx);
    // let strAttrName = attr.name.toUpperCase();
    let strAttrName = attr.name.replace("def:", "");
    value[strAttrName] = attr.value;
  }
  let id = value["OID"];
  this.dataset[id] = value;
  if (xmlItemRefs.length > 0) {
    for (let cidx = 0; cidx < xmlItemRefs.length; cidx++) {
      let child = xmlItemRefs.item(cidx);
      if (child.nodeType == DOMNodeTypes.ELEMENT_NODE) {
        let key = child.getAttribute("ItemOID");
        let method = child.getAttribute("MethodOID");
        this.variable[key] = this.variable[key] || {};
        // this.variable[key]["ItemGroupOIDs"] = this.variable[key]["ItemGroupOIDs"] || [];
        // this.variable[key]["ItemGroupOID"] = Object.assign({}, value);
        this.variable[key]["ItemGroupOID"] = id;
        if (method) this.variable[key]["MethodOID"] = method;
      }
    }
  }
  //   console.log(this.variable);
  //   console.log("1");
};

pp.parseVariable = function (xmlNode) {
  let arrAttribute = xmlNode.attributes;
  let value = {};
  for (let aidx = 0; aidx < arrAttribute.length; aidx++) {
    let attr = arrAttribute.item(aidx);
    let strAttrName = attr.name.replace("def:", "");
    value[strAttrName] = attr.value;
  }
  let key = value["OID"];
  if (this.variable[key])
    this.variable[key] = Object.assign(value, this.variable[key]);
  else {
    this.variable[key] = value;
  }
  let xmlOrigins = xmlNode.getElementsByTagName("def:Origin");
  if (xmlOrigins.length == 0) return;
  for (let cidx = 0; cidx < xmlOrigins.length; cidx++) {
    let child = xmlOrigins.item(cidx);
    if (child.nodeType == DOMNodeTypes.ELEMENT_NODE) {
      let strType = child.getAttribute("Type");
      if (strType.toLowerCase() === "predecessor") {
        let xmlDescription = child.getElementsByTagName("Description");
        let xmlTranslatedText = xmlDescription
          .item(0)
          .getElementsByTagName("TranslatedText");
        for (let i = 0; i < xmlTranslatedText.length; i++) {
          let text = xmlTranslatedText.item(i).childNodes[0].nodeValue;
          let arr = text.split(".");
          this.variable[key]["links"] = this.variable[key]["links"] || [];
          this.variable[key]["links"].push({
            dataset: arr[0],
            variable: arr[1],
          });
        }
      }
    }
  }
};
let reDataset=/[A-Z_0-9]{1,8}\.[A-Z_0-9]{1,8}/g;
let reVariable=/[A-Z_0-9]{1,8}(?=\s)/g;
pp.parseMethod = function (xmlNode) {
  let arrAttribute = xmlNode.attributes;
  let value = {};
  for (let aidx = 0; aidx < arrAttribute.length; aidx++) {
    let attr = arrAttribute.item(aidx);
    let strAttrName = attr.name.replace("def:", "");
    value[strAttrName] = attr.value;
  }
  let key = value["OID"];
  let text=this.parseTranslatedText(xmlNode);

  // console.log(key);
  console.log(text);
  console.log(text.match(reVariable));
};
pp.parseData = function () {
  let nodes = [];
  let links = [];
  let dict = new Set();
  let ds = new Map();

  Object.keys(this.variable).forEach((key) => {
    let vname = this.variable[key]["Name"];
    let did = this.variable[key]["ItemGroupOID"];
    let list = this.variable[key]["links"];
    let id;
    if (this.dataset[did]) {
      let dname = this.dataset[did]["Name"];
      if (!ds.get(dname)) ds.set(dname, ds.size + 1);
      id = dname + "." + vname;
      nodes.push({
        id: id,
        group: ds.get(dname),
        variable: vname,
        dataset: dname,
      });
    }
    if (list) {
      list.forEach((link) => {
        let key = link["dataset"] + "." + link["variable"];
        // ds.add(link["dataset"]);
        if (!ds.get(link["dataset"])) ds.set(link["dataset"], ds.size + 1);
        if (!dict.has(key)) {
          dict.add(key);
          nodes.push({
            id: key,
            dataset: link["dataset"],
            variable: link["variable"],
            group: ds.get(link["dataset"]),
          });
        }
        if (id) links.push({ source: key, target: id, value: 1 });
      });
    }
  });
  //   console.log(nodes);
  return { nodes, links };
};
pp.parseTranslatedText = function (xmlNode) {
  if (!xmlNode) return;
  let xmlTranslatedText = xmlNode.getElementsByTagName("TranslatedText").item(0);
  if (!(xmlTranslatedText && xmlTranslatedText.childNodes[0])) return;
  let strContent = xmlTranslatedText.childNodes[0].nodeValue;
  return this.unescapeXmlChars(strContent);
};
pp.unescapeXmlChars = function (str) {
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
};
module.exports = { PARSER };
