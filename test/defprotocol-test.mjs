#external (describe, it)

#metaimport '..'

refer (require 'chai') expect

var mori = require 'mori'

describe
  '#defprotocol'
  #->

    it
      'can define single function protocols'
      #->
        #defprotocol Countable
          count coll
        (expect count).to.equal Countable.count

    it
      'can define multi function protocols'
      #->
        #defprotocol Service
          start s
          stop s

        (expect start).to.equal Service.start
        (expect stop).to.equal Service.stop

    it
      'can create multiple protocol instances'
      #->
        fun instantiate () ->
          #defprotocol Runnable
            run o

        var p1 = instantiate ()
        var p2 = instantiate ()

        var o = {}
        #extend p1 o
          run o -> ::p1
        #extend p2 o
          run o -> ::p2

        (expect p1.run o).to.equal ::p1
        (expect p2.run o).to.equal ::p2


describe
  '#extend'
  #->

    #defprotocol Startable
      start o

    it
      'can extend protocols to classes'
      #->
        fun Server () ->
          this.started = false

        #extend Startable Server
          start s ->
            s.started = true

        var s = new Server ()
        start s
        (expect s.started).to.equal true

    it
      'can extend protocols to objects'
      #->
        var a = {}

        #extend Startable a
          start o ->
            o.started = true

        start a
        (expect a.started).to.equal true

    [[Boolean, false], [Number, 0]].for-each fun [type, value] ->
      it
        'can extend protocols to primitive type ' + typeof value
        #->
          refer JSON stringify
          #defprotocol Representable
            repr o
          #extend Representable type
            repr o -> stringify o
          (expect repr value).to.equal stringify value

    it
      'throws for unsupported protocol'
      #->
        var action = #-> start {}
        (expect action).to.throw "`Startable' protocol not supported by `[object Object]'"
