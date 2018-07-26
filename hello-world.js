const hljs = require("highlight.js");

const md = require("markdown-it")({
  html: true,
  linkify: true,
  typograther: true,
  highlight: function(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return (
          `<pre class="hljs "><code><div class="code__content">` +
          hljs.highlight(lang, str, true).value +
          "</div></code></pre>"
        );
      } catch (__) {}
    }

    return (
      '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + "</code></pre>"
    );
  }
});

//requiring path and fs modules
const path = require("path");
const http = require("http");
const fs = require("fs");
const ejs = require("ejs");
const ejsLint = require("ejs-lint");
//joining path of directory
let directoryPath = path.join(__dirname, "content");
//passsing directoryPath and callback function

const indexHtmlFormat = fs.readFileSync("./public/index.html", "utf8");
const sidebarHtmlFormat = fs.readFileSync("./public/sidebar.html", "utf8");
const listHtmlFormat = fs.readFileSync("./public/list.html", "utf8");
const homeHtmlFormat = fs.readFileSync("./public/home.html", "utf8");
const articleHtmlFormat = fs.readFileSync("./public/article.html", "utf8");
const headerHtmlFormat = fs.readFileSync("./public/header.html", "utf8");

// md파일에서 사용자가 입력한 값 추출하기
function extractedValue(md) {
  string = md.match(/\n*(\+\+\+)\n*([\s\S]+)\n*(\+\+\+)/);

  if (string === null) {
    value = { title: "", date: "" };
    return value;
  } else {
    str = string[2].match(/[^\r\n]+/g);
    let extractedValue = {};
    str.forEach(value => {
      if (value !== " ") {
        let valueline = value.match(/(.+)[=\n](.+)/);
        if (valueline != null) {
          key = valueline[1].replace(/\s/g, "");
          value = valueline[2].replace(/['"]*/g, "").replace(/\s/g, "");
          extractedValue[key] = value;
        }
      }
    });
    return extractedValue;
  }
}

// md 파일에서 사용자가 입력한 값을 제외한 본문 추출하기
function extractedBody(md) {
  return md.replace(/\n*(\+\+\+)\n*([\s\S]+)\n*(\+\+\+)/, "");
}

// 폴더 만들어주기
let dir = "./deploy/category";
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

// 사용자 정보 읽기
const author = fs.readFileSync("./author/author.md", "utf8");
const authorValue = extractedValue(author);

// content 안에 있는 directories 읽기
let directories = fs.readdirSync(directoryPath);

let articles = [];
let categoryByfiles = [];

directories.forEach((directory, index) => {
  const fileList = fs.readdirSync(`./content/${directory}`);
  // 파일에서 value 와 body를 변환해서 categoryByfiles에 푸시해줌.
  let files = [];
  fileList.forEach(file => {
    const markdownFile = fs.readFileSync(
      `./content/${directories[index]}/${file}`,
      "utf-8"
    );

    let value = extractedValue(markdownFile);
    let body = md.render(extractedBody(markdownFile));
    let category = value.category;
    let fileName = file.slice(0, file.indexOf(".")) + `.html`;

    let i = files.findIndex(o => o.category === category);
    let fileObj = {
      fileName,
      body,
      value
    };
    if (i < 0) {
      files.push({
        category: value.category,
        files: [fileObj]
      });
    } else {
      files[i].files.push(fileObj);
    }
    articles.push(fileObj);
  });

  categoryByfiles.push(...files);
});

// 컴포넌트, 파일 만들기
// articles : 모든 post를 모아 놓음 [{value: ..., body:..., fileName: ...html}]형식임
// categoryByfiles : 카테고리 별로 post를 모아 놓음 [{category:..., files:[{value:..., body: ..., fileName:...,}, {}, {}, {}]}, {category2}...]
// header
const header = ejs.render(headerHtmlFormat, {
  author: authorValue,
  categories: categoryByfiles
});
// sidebar
const sidebar = ejs.render(sidebarHtmlFormat, {
  categories: categoryByfiles
});

//
categoryByfiles.forEach(category => {
  // category page 생성

  if (category.category !== undefined) {
    let dir = `./deploy/${category.category}`;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
  }
  // category별로 file의 리스트를 보여주는 category 페이지 생성

  const main = ejs.render(listHtmlFormat, {
    files: category.files,
    category: category.category
  });
  const indexHtml = ejs.render(indexHtmlFormat, {
    header: header,
    main: main,
    sidebar: sidebar
  });
  fs.writeFileSync(`./deploy/category/${category.category}.html`, indexHtml);
  // 파일 별로 post page를 생성
  category.files.forEach(file => {
    const article = ejs.render(articleHtmlFormat, {
      body: file.body,
      value: file.value,
      fileName: file.fileName
    });
    const html = ejs.render(indexHtmlFormat, {
      main: article,
      sidebar: sidebar,
      header: header
    });
    fs.writeFileSync(`./deploy/${category.category}/${file.fileName}`, html);
  });
});

//홈화면 생성

main = ejs.render(homeHtmlFormat, {
  articles: articles
});
html = ejs.render(indexHtmlFormat, {
  main,
  sidebar,
  header
});

fs.writeFileSync("./index.html", html);
