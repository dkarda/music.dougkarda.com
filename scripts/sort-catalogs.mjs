import fs from "node:fs";
import ts from "typescript";

const collator = new Intl.Collator("en", {
  sensitivity: "base",
  numeric: true,
});

function propertyString(object, propertyName, source) {
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
      ? property.name.text
      : "";
    if (name === propertyName && ts.isStringLiteral(property.initializer)) {
      return property.initializer.text;
    }
  }
  throw new Error(`Missing ${propertyName} in ${object.getText(source)}`);
}

function sortArray(fileUrl, variableName) {
  const text = fs.readFileSync(fileUrl, "utf8");
  const source = ts.createSourceFile(fileUrl.pathname, text, ts.ScriptTarget.Latest, true);
  let array;

  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === variableName &&
        declaration.initializer &&
        ts.isArrayLiteralExpression(declaration.initializer)
      ) {
        array = declaration.initializer;
      }
    }
  }

  if (!array) throw new Error(`Could not find ${variableName}`);
  const entries = array.elements.map((element) => {
    if (!ts.isObjectLiteralExpression(element)) throw new Error("Expected object entry");
    return {
      name: propertyString(element, "name", source),
      text: element.getText(source),
    };
  });
  entries.sort((a, b) => collator.compare(a.name, b.name));

  const replacement = `[\n${entries.map((entry) => `  ${entry.text}`).join(",\n")},\n]`;
  const next = text.slice(0, array.getStart(source)) + replacement + text.slice(array.getEnd());
  fs.writeFileSync(fileUrl, next);
  console.log(`Sorted ${entries.length} ${variableName} entries`);
}

sortArray(new URL("../src/data/artists.ts", import.meta.url), "artists");
sortArray(new URL("../src/data/people.ts", import.meta.url), "people");
