var http = require('http');
var url = require('url');
var request = require('request');
var MongoClient = require('mongodb').MongoClient;
var apiKey = process.env.KEY;
var engineId = process.env.CX;
var mongoUrl = process.env.MONGO_URL;

function logSearch(obj){
  MongoClient.connect(mongoUrl, function(err, db){
    
    if (err) throw err;
    
    db.collection("recent-searches").insertOne(obj, function(err, res){
      if (err) throw err;
      console.log("Inserted the following", obj);
      db.close;
    })
  })
};

var server = http.createServer(function(req, res){
  
  var reqUrl = url.parse(req.url).pathname.slice(1);
  var offset = "1";
  
  if (url.parse(req.url).query){
    
    if (url.parse(req.url, true).query.offset){
      offset = url.parse(req.url, true).query["offset"];
      console.log("Yes offset");
    }
  }
  
  if (reqUrl.startsWith("api/imagesearch/")){
    
    var searchQuery = reqUrl.substring(16);
    var dateStamp = new Date;
    var dateString = dateStamp.toString();
    
    logSearch({term: searchQuery.replace("%20", " "), when: dateString});
    
    var getUrl = "https://www.googleapis.com/customsearch/v1?q=" + searchQuery + "&cx=" + engineId + "&searchType=image&start=" + offset + "&num=10&key=" + apiKey;
    
    console.log(searchQuery, offset);
  
    request(getUrl, {json: true}, function(err, response, body){
      
      if (err){
        console.log(err);
      }
      
      else if (body.error){
        console.log(body.error.errors[0]["message"]);
        var errMsg = "There is an error for this reason: " + body.error.errors[0]["reason"];
        res.end(errMsg)
      }
      
      else {
        
        var result = [];
        
        for (var i=0; i<10; i++){
          
          !function (x){
            
            var item = {
              url: body.items[x]["link"],
              snippet: body.items[x]["snippet"],
              thumbnail: body.items[x]["image"]["thumbnailLink"],
              context: body.items[x]["image"]["contextLink"]
            };
            
            result.push(item);
            
            if (result.length==10){

              res.end(JSON.stringify(result));
            }
          }(i)
          
        }
        
      }

    })
  }
  
  else if (reqUrl == "api/latest/imagesearch/" || reqUrl == "api/latest/imagesearch"){
    
    console.log("Requested latest image search.")
    
    MongoClient.connect(mongoUrl, function(err, db){
      
      if (err) throw err;
      
      db.collection("recent-searches").find({}, {_id:false}).sort({$natural:-1}).limit(5).toArray(function(err, result){
        if (err) throw err;
        console.log("find was successful", result);
        res.end(JSON.stringify(result));
        db.close;
      })
    })
    
  }
  
  else{
    
    res.end("Please enter a search query at /api/imagesearch/. See recent searches at /api/latest/imagesearch/.");
  }
  
});

server.listen(8080);

