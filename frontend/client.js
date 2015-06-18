var React = require('react');
var marked = require('marked');
var $ = require('jquery');
window.jQuery = $;
var hljs = require('highlight.js');
var io = require('socket.io-client');
var socket = io.connect();
var SidePanel = require('./sidePanel.js');
var bootstrap = require('bootstrap-less/js/bootstrap.js');
var pin = require('./plugins/jquery.pin.js');
var ReactRouter = require('react-router');
var Router = ReactRouter.Router;
var Route = ReactRouter.Route;

var thisUser = '';

var SPLIT_CHARS = "//";

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

var Application = React.createClass({
	getInitialState: function() {
		return {username: ''};
	},
	handleSubmit: function(e) {
		e.preventDefault();
		thisUser = React.findDOMNode(this.refs.username).value.trim();
		React.findDOMNode(this.refs.username).value = '';
		this.setState({username: thisUser});
	},
	render: function () {
		if (thisUser === '') {
			return (
				<div className = "Application">
          <div className="init-container">
            <img src="images/splash.png" />
  					<form className="usernameForm" onSubmit={this.handleSubmit}>
  						<input type="text" placeholder="What's your name?" className="usernameField" ref="username"/>
  						<button type="submit">Go</button>
  					</form>
          </div>
				</div>
			);
		} else {
			return (
				<div className = "Application row">
	  			<SidePanel/>
					<ChatBox url="initial" pollInterval={2000}/>
				</div>
			);
		}
	}
});

var ChatBox = React.createClass({
  loadMessagesFromServer: function() {
    $.ajax({
      url: this.props.url,
      dataType: 'json',
      cache: false,
      success: function(data) {
        this.setState({data: data});
      }.bind(this),
      error: function(xhr, status, err) {
        console.error(this.props.url, status, err.toString());
      }.bind(this)
    });
  },
  handleMessageSend: function(message) {
    message.color = '#'+(Math.random()*0xFFFFFF<<0).toString(16);
    var date = new Date();
    message.timestamp = date.getHours().toString() + ':' + date.getMinutes().toString();
    var messages = this.state.data;
    var newMessages = messages.concat([message]);
    this.setState({data: newMessages});
    socket.emit('chat message', message);
  },
  handleMessageReceive: function(message) {
    var messages = this.state.data;
    var newMessages = messages.concat([message]);
    this.setState({data: newMessages});
  },
  getInitialState: function() {
    return {data: []};
  },
  componentDidMount: function() {
    this.loadMessagesFromServer();
    socket.on('chat message', this.handleMessageReceive);
  },
  render: function() {
    return (
      <div className="ChatBox col-md-9">
        <ChatList data={this.state.data}/>
        <ChatForm onMessageSend={this.handleMessageSend}/>
      </div>
    );
  }
});

var ChatList = React.createClass({
  render: function() {
    var currentAuthor = "";
    var messageNodes = this.props.data.map(function(message) {
      var sameAuthor = currentAuthor == message.author;
      currentAuthor = message.author;
      return (
        <Message msg={message} sameAuthor={sameAuthor}>
          {message.text}
        </Message>
      );
    })
    return (
      <div className="chatList">
        {messageNodes}
      </div>
    );
  }
});

var ChatForm = React.createClass({
  handleSubmit: function(e) {
    e.preventDefault();
    var author = thisUser;
    var text = React.findDOMNode(this.refs.text).value.trim();
    if (!text || !author || text == "//") {
      return;
    }
    this.props.onMessageSend({author: author, text: text});
    var cc = $(".chatList");
    cc.stop().animate({
      scrollTop: cc[0].scrollHeight
    }, 500);
    //React.findDOMNode(this.refs.author).value = '';
    React.findDOMNode(this.refs.text).value = '';
    return;
  },
	componentDidMount: function() {
		$('textarea').keydown(function(e) {
			if (e.keyCode == 13 && !e.shiftKey) {
				$('.message-send').click();
				e.preventDefault();
			}
		});
	},
  render: function() {
    return (
      <form className="chatForm row" onSubmit={this.handleSubmit}>
        <textarea placeholder="Say something..." className="message-field col-xs-10" ref="text"/>
        <input type="submit" value="Send" className="message-send col-xs-2" Send/>
      </form>
    );
  }
});

var Message = React.createClass({
	pinMessage: function() {
		this.setState({id: this.state.id, pinned: true});
	},
	getInitialState: function() {
		return { pinned: false};
	},
	selectAll: function() {

	},
	render: function() {
		this.state.id = guid();
    emojione.ascii = true; //jus making sure
    var authorBody = (<div className="author-container col-xs-3"><div className="gravatar"></div><div className="author"><strong>{this.props.msg.author}</strong></div></div>);
    if (this.props.sameAuthor) {
      authorBody = (<div className="author-container col-xs-3"></div>);
    }
    var rawMarkup = emojione.toImage(this.props.children.toString());
    rawMarkup = marked(rawMarkup, {sanitize: false});
    var generatedClass = this.props.msg.myself ? "message-container row myself" : "message-container row";
    if (!this.props.sameAuthor) generatedClass += " gap";
		if (this.state.pinned) {
			generatedClass += ' pinned';
		}

    var ss = this.props.msg.text;
    var chunks = ss.split(SPLIT_CHARS)
    ss = ss.substring(ss.indexOf(SPLIT_CHARS)+SPLIT_CHARS.length);
    var code;
    console.log("idbfr: "+ this.state.id);

    if (chunks.length > 1 && ss.length > 0) {
      var normalText = chunks[0];
      normalText = emojione.toImage(normalText);
      code = (<div>
                <span dangerouslySetInnerHTML={{__html: marked(normalText, {sanitize: false})}} />
                <div className="codeblock">
                  <pre>
										<code id={"code-"+this.state.id} ref="code">{ss}</code>
									</pre>
                </div>
                <div className="action-buttons">
                  <button className="action-button select-all" data-id={this.state.id} title="Select All">
                    <i className="fa fa-copy"></i>
                  </button>
                  <button className="action-button" title="Search">
                    <i className="fa fa-search"></i>
                  </button>
                  <button className="action-button" title="Edit">
                    <i className="fa fa-pencil"></i>
                  </button>
                </div>
              </div>);
			
    }
    var messageBody = !code ? (<span dangerouslySetInnerHTML={{__html: rawMarkup}} />) : (code);
    console.log("idlater: "+ this.state.id);
    
    return (
      <div className={generatedClass} style={{'borderColor': this.props.msg.color}}>
        {authorBody}
        <div className="message col-xs-8">
          {messageBody}
          <div className="timestamp">{this.props.msg.timestamp}</div>
        </div>
        <button className="pin-button col-xs-1" onClick={this.pinMessage} title="Pin">
          <i className="fa fa-thumb-tack"></i>
        </button>
      </div>
    );
  },
  componentDidMount: function() {
    $('pre code').each(function(i, block) {
      hljs.highlightBlock(block);
    });
		$('.pinned').pin({containerSelector: '.ChatBox'});
		var msgId = this.state.id;
		$("#copyBtn-"+this.state.id).click(function(){
			console.log("copy btn: "+document.getElementById("code-"+msgId));
  		select_all((document.getElementById("code-"+msgId)));
  	});
  }
});

React.render(
	<Application/>,
	document.getElementById('content')
);

function select_all(el) {
	console.log("element: "+el);
  if (typeof window.getSelection != "undefined" && typeof document.createRange != "undefined") {
      var range = document.createRange();
      range.selectNodeContents(el);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
  } else if (typeof document.selection != "undefined" && typeof document.body.createTextRange != "undefined") {
      var textRange = document.body.createTextRange();
      textRange.moveToElementText(el);
      textRange.select();
  }
}

$(".content").on("click", ".action-button", function(e) {
  console.log("yo");
  console.log(e.attr('data-id'));
});
