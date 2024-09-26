export const EXAMPLE_CONFIG = `#
# This is content-to-reader example configuration file.
# Use this file to generate EPUBs from WWW pages.
#

# Filename or output path of a result EPUB file. Not required if \`toDevice\` present.
output: "news.epub"
# In this section you configure automatic sending a result EPUB file to your device using your email account. Your credentials aren't stored in any way and are used solely for sending a result file to your device. Currently only Gmail is supported. Not required if \`output\` present.
toDevice:
  # This is an email address of your reader device (ex. Kindle reader).
  deviceEmail: ""
  # This is an email address of your Gmail acccount
  senderEmail: ""
  # This is an application password for your Gmail account. Read up how to generate one: https://support.google.com/mail/answer/185833?hl=en
  senderPassword: ""
# In this section you configure content present in the result EPUB file.
pages:
    # You can extract content automatically by passing URL only.
  - "https://page.com"
    # Or use selectors to pick what you want.
  - url: "https://page.com"
    selectors:
        # You can select first element encountered...
      - name: "Header" # Name is not required but it may help debugging
        first: ".page-content header"
        # ... or all of them.
      - name: "Content"
        all:
          # Use nested selectors to create verbose element queries
          ".page-content .contents":
            [
              "h1",
              "h2",
              "h3",
              "h4",
              "h5",
              "p",
              "code",
              { ".custom-tip": ["p", "div", ".some-class": ["a", "p"]] },
            ]

`;
