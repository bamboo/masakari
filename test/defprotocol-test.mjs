#external (describe, it)

#metaimport '..'

refer (require 'chai') expect

#defmacro #defprotocol
  binaryKeyword
  LOW
  expand: (name, body) ->

    var name-val = name.new-value name.val
    var fns = body.as-tuple ().map #->
      assert! #it.call? ()
      var (f, args) = (#it.at 0, #it.at (1).as-tuple ())
      `(~`f):
        fun (~`f) (~`args) ->
          var self = (~`args.at 0)
          var vtable = self[(~`name).id]
          if vtable
            vtable.(~`f) (~`args)
          else
            throw Error
              '`' + (~`name-val) + '\' protocol not supported by `' + self + "'"

    var name-decl = name.new-tag name.val
    name-decl.handle-as-tag-declaration ()
    `
      #no-new-scope do
        var (~`name-decl) = {
          id: (~`name-val) + '_' + Math.random ().to-string (36).substr (2)
          extend: (value, vtable) ->
            (value.prototype || value)[(~`name).id] = vtable
          (~`fns)
        }
        (~`name)

#defmacro #extend
  ternaryKeyword
  LOW
  expand: (name, value, body) ->
    var fns = body.as-tuple ().map #->
      var (n, lambda) = (#it.at 0, #it.at 1)
      `((~`n): ~`lambda)
    `
      (~`name).extend (~`value, {~`fns})


describe
  '#defprotocol'
  #->
    it
      'can define single function protocols'
      #->
        #defprotocol Countable
          count coll
        #extend Countable String
          count s -> s.length
        expect (count '42').to.equal 2

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

    it
      'throws for unsupported protocol'
      #->
        var action = #-> start {}
        (expect action).to.throw "`Startable' protocol not supported by `[object Object]'"
