#external (describe, it)

#metaimport '..'

refer (require 'chai') expect

describe
  '#defrecord'
  #->

    #defrecord Point (x, y)

    it
      "defines constructor that doesn't require `new'"
      #->
        (expect Point (1, 2)).to.be.an.instanceof Point

    it
      'overrides to-string'
      #->
        expect ('' + Point (1, 2)).to.eql 'Point (1, 2)'
