<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:atom="http://www.w3.org/2005/Atom">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/rss/channel">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="${ tacs.config.language }">
      <head>
        <title><xsl:value-of select="title"/> feed</title>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <style type="text/css">
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          html {
            color-scheme: light dark;
          }

          body {
            font-family: sans-serif;
            line-height: 1.5;
          }

          a:link, a:visited {
            display: block;
            text-decoration: none;
          }

          a:hover, a:focus, a:active {
            color: SelectedItem;
          }

          header {
            text-align: center;
            padding: 0.5rem 2rem 1rem;
            color: ButtonText;
            background-color: ButtonFace;
          }

          svg {
            display: inline-block;
            width: 1em;
            height: 1em;
            vertical-align: -0.125em;
            margin-right: 0.3em;
          }

          p {
            text-wrap: pretty;
            margin-top: 0.6rem;
          }

          p.date {
            text-align: right;
          }

          main {
            max-width: min(35rem, 100% - 8vw);
            padding: 3rem 0;
            margin-inline: auto;
          }

          h1, h2 {
            line-height: 1.2;
            text-wrap: balance;
          }

          article {
            border-top: 1px solid ButtonFace;
          }

          article:first-of-type {
            margin-top: 2rem;
          }

          article:last-of-type {
            margin-bottom: 2rem;
            border-bottom: 1px solid ButtonFace;
          }

          article a {
            padding: 1.5rem 0;
          }

          article p {
            color: GrayText;
          }

          article p.date {
            font-size: 0.85rem;
          }
        </style>
      </head>
      <body>
        <header>

          <p><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="#f78422" width="20" height="20"><path d="M14.92 18H18C18 9.32 10.82 2.25 2 2.25v3.02c7.12 0 12.92 5.71 12.92 12.73zm-5.44 0h3.08A10.5 10.5 0 0 0 2 7.6v3.02c2 0 3.87.77 5.29 2.16A7.3 7.3 0 0 1 9.48 18zm-5.35-.02c1.17 0 2.13-.93 2.13-2.09 0-1.15-.96-2.09-2.13-2.09-1.18 0-2.13.94-2.13 2.09a2.1 2.1 0 0 0 2.13 2.09z"/></svg> <strong><xsl:value-of select="title"/> RSS feed</strong></p>
          <p>Please subscribe to:
            <a>
              <xsl:attribute name="href">
                <xsl:value-of select="atom:link[@rel='self']/@href"/>
              </xsl:attribute>
              <xsl:value-of select="atom:link[@rel='self']/@href"/>
            </a>
          </p>

        </header>
        <main>

          <h1><a>
            <xsl:attribute name="href">
              <xsl:value-of select="link"/>
            </xsl:attribute>
            <xsl:value-of select="title"/>
          </a></h1>
          <p><xsl:value-of select="description"/></p>
          <p>Latest posts on <xsl:value-of select="lastBuildDate"/>&#8230;</p>

          <xsl:for-each select="item">
            <article>
              <a>
                <xsl:attribute name="href">
                  <xsl:value-of select="link"/>
                </xsl:attribute>
                <h2><xsl:value-of select="title"/></h2>
                <p><xsl:value-of select="description"/></p>
                <p class="date"><xsl:value-of select="pubDate" /></p>
              </a>
            </article>
          </xsl:for-each>

          <p><a>
            <xsl:attribute name="href">
              <xsl:value-of select="link"/>
            </xsl:attribute>
            <strong>Home page &#9658;</strong>
          </a></p>

        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
