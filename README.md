## Sample REST API with Node.js without any database 

This project create for Retrofit tutorial that publish in my youtube channel, all of data save in json file so you don't need configure any database connection :)

### project dependencies

just install [Node.js](https://nodejs.org/en/) in your system

### how to use from this project

##### clone the repository
```
$ git clone https://github.com/atahani/rest-api-sample
$ cd rest-api-sample
$ git branch -a | grep -v HEAD | perl -ne 'chomp($_); s|^\*?\s*||; if (m|(.+)/(.+)| && not $d{$2}) {print qq(git branch --track $2 $1/$2\n)} else {$d{$_}=1}' | csh -xfs
```

NOTE: in this repo we have two branch `simple_rest_api` and `rest_api_with_authentication`

##### checkout branch and install nodejs module via npm command
```
 $ git checkout rest_api_with_authentication
 $ npm install
 $ node server.js 
```

### for more information see the slide and videos

* [Youtube Playlist link](https://www.youtube.com/playlist?list=PL-0EQDLPE23N3WkenBrZzTLfnOIAIybKm)
* [Slides on Google Slide](https://goo.gl/lzwXys)