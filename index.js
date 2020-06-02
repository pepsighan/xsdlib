const parser = require("fast-xml-parser");
const format = require("xml-formatter");
const toJsonSchema = require("to-json-schema");
const beautify = require("json-beautify");

const generateObj = (keys, values, hasParent = true) => {
  let xml = "";
  if (hasParent) {
    xml += `<xs:complexType>`;
    xml += `<xs:sequence>`;
  } else if (!hasParent && keys.length > 1) {
    xml += `<xs:element name="root">`;
    xml += `<xs:complexType>`;
    xml += `<xs:sequence>`;
  }

  for (let key in keys) {
    const type = values[key].type;
    if (type === "object") {
      const obj = values[key];
      const keys2 = Object.keys(obj.properties);
      const values2 = Object.values(obj.properties);
      xml += `<xs:element name="${keys[key]}">`;
      xml += generateObj(keys2, values2);
      xml += `</xs:element>`;
    } else if (type === "array") {
      const obj = values[key];
      const keys2 = Object.keys(obj.items);
      const values2 = Object.values(obj.items);
      xml += `<xs:element name="${keys[key]}">`;
      xml += generateObj(keys2, values2);
      xml += `</xs:element>`;
    } else if (typeof type === "string" && type.length > 0) {
      xml += `<xs:element type="xs:${type}" name="${keys[key]}"/>`;
    }
  }

  if (hasParent) {
    xml += `</xs:sequence>`;
    xml += `</xs:complexType>`;
  } else if (!hasParent && keys.length > 1) {
    xml += `</xs:element>`;
    xml += `</xs:sequence>`;
    xml += `</xs:complexType>`;
  }

  return xml;
};

const OBJtoXSDElement = (obj) => {
  let xml = `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">`;
  const type = obj.type;
  if (type === "object") {
    const keys = Object.keys(obj.properties);
    const values = Object.values(obj.properties);
    xml += generateObj(keys, values, false);
  }
  xml += `</xs:schema>`;
  xml = xml.replace(/<\/?[0-9]{1,}>/g, "");
  return xml;
};

generateJson = (keys, values) => {
  let jsonString = ``;
  let key = values[0];
  if (keys[1] === "xs:complexType") {
    const keys2 = Object.keys(values[1]["xs:sequence"]);
    const values2 = Object.values(values[1]["xs:sequence"]);

    jsonString += `,"properties":{
      "${key}" : {
        "type": "object",
        "properties": {}
      }
     }`;
  }
  return jsonString;
};

const xmlSchemaOBJtoJsonSchema = (jsonObj) => {
  let jsonString = "";
  const parentObj = jsonObj["xs:schema"];
  if (parentObj) {
    const mainObj = parentObj["xs:element"];
    let keys = Object.keys(mainObj);
    let values = Object.values(mainObj);
    jsonString += `{"type":"object"`;
    if (keys.length === 2) {
      jsonString += generateJson(keys, values);
    }
    jsonString += `}`;
  }

  return JSON.parse(jsonString);
};

exports.xml2xsd = (xmlString) => {
  const jsonObj = parser.parse(xmlString, { ignoreAttributes: false });
  const schema = toJsonSchema(jsonObj);
  return format(OBJtoXSDElement(schema));
};

exports.json2xsd = (jsonObj) => {
  const schema = toJsonSchema(jsonObj);
  return format(OBJtoXSDElement(schema));
};

exports.jsonSchema2xsd = (jsonSchema) => {
  return format(OBJtoXSDElement(jsonSchema));
};

exports.xsd2json = (xsdString) => {
  const jsonObj = parser.parse(xsdString, { ignoreAttributes: false, attributeNamePrefix: "attribute_" });
  return beautify(xmlSchemaOBJtoJsonSchema(jsonObj));
};

exports.validateXml = (string) => {
  return parser.validate(string);
};

exports.detectXmlSchema = (string) => {
  if (parser.validate(string) === true) {
    if (string.endsWith("</xs:schema>")) {
      return "xsd";
    } else return "xml";
  } else return parser.validate(string);
};
