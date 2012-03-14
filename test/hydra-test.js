var buster = require("buster");
var sinon = require("sinon");
var Hydra = require("../lib/hydra").Hydra;
var HydraHeadStatic = require("../lib/hydraHead").HydraHeadStatic;

buster.spec.expose();

function simpleHydraHead(path, content, name) {
    path    = path    || '/.*';
    content = content || 'foo';
    return new HydraHeadStatic({name: name, path: path, content: content})
}

describe("Hydras", function() {
    it("can be created", function() {
        expect(new Hydra()).toBeDefined();
    });

    it("can't register plugins without heads", function() {
        var hydra = new Hydra();
        expect(function() {
            hydra.registerPlugin({heads: []});
        }).toThrow("InvalidHydraPluginException");
    });

    it("can't register plugins without name", function() {
        var hydra = new Hydra();
        expect(function() {
            hydra.registerPlugin({heads: [new HydraHeadStatic({content: 'foo'})]});
        }).toThrow("InvalidHydraPluginException");
    });

    it("can't register plugins with invalid names", function() {
        var hydra = new Hydra();
        var heads = [simpleHydraHead()];

        ['', ' ', '..', 'foo.bar', 'foo/bar'].forEach(function(v) {
            expect(function() {
                hydra.registerPlugin({name: v,
                                      heads: heads});
            }).toThrow("InvalidHydraPluginException");
        });
    });

    it("can register plugins with one head", function() {
        var hydra = new Hydra();
        hydra.registerPlugin({name: 'simple_plugin',
                              heads: [simpleHydraHead()]});
        expect(hydra.plugins()).toEqual(['simple_plugin']);
    });

    it("can't register two plugins with the same name", function() {
        var hydra = new Hydra();
        var plugin1 = {name: 'simple_plugin',
                       heads: [simpleHydraHead('/', 'foo')]};
        var plugin2 = {name: 'simple_plugin',
                       heads: [simpleHydraHead('/.*', 'bar')]};
        hydra.registerPlugin(plugin1);
        expect(hydra.plugins()).toEqual(['simple_plugin']);
        expect(function() {
            hydra.registerPlugin(plugin2);
        }).toThrow("DuplicateHydraPluginException");
    });

    it("can register several plugins", function() {
        var hydra = new Hydra();
        var plugin1 = {name: 'plugin1',
                       heads: [simpleHydraHead('/hydra-admin',
                                               'Hydra Admin UI')]};
        var plugin2 = {name: 'plugin2',
                       heads: [simpleHydraHead('/.*', 'Not Found')]};
        hydra.registerPlugin(plugin1);
        expect(hydra.plugins()).toEqual(['plugin1']);
        hydra.registerPlugin(plugin2);
        expect(hydra.plugins()).toEqual(['plugin1', 'plugin2']);
    });

    it("consider all paths 404 when there are no plugins", function() {
        var hydra = new Hydra();
        var res = {send: sinon.spy()};
        hydra.handle({url: '/'}, res, function() {});
        expect(res.statusCode).toEqual(404);
        expect(res.send).toBeCalledWith('Not Found');
    });

    it("can dispatch a single, catch-all path", function() {
        var hydra = new Hydra();
        var content = 'It works!';
        var heads = [simpleHydraHead('/.*', content)];
        hydra.registerPlugin({name: 'plugin1', heads: heads});
        var res = {send: sinon.spy()};
        hydra.handle({url: '/'}, res, function() {});
        expect(res.statusCode).toEqual(200);
        expect(res.send).toBeCalledWith(content);
    });

    it("traverse heads in order when dispatching", function() {
        var hydra = new Hydra();
        var content = 'It works!';
        var heads = [simpleHydraHead('/', content),
                     simpleHydraHead('/.*', 'Fail!')];
        hydra.registerPlugin({name: 'plugin1', heads: heads});
        var res = {send: sinon.spy()};
        hydra.handle({url: '/'}, res, function() {});
        expect(res.statusCode).toEqual(200);
        expect(res.send).toBeCalledWith(content);
    });

    it("deliver 404 when there are routes, but none match", function() {
        var hydra = new Hydra();
        var heads = [simpleHydraHead('/foo'), simpleHydraHead('/bar')];
        hydra.registerPlugin({name: 'plugin1', heads: heads});
        ['/', '/qux', '/foobar', '/foo/bar'].forEach(function(path) {
            var res = {send: function() {}};
            hydra.handle({url: path}, res, function() {});
            expect(res.statusCode).toEqual(404);
        });
    });

    it("doesn't allow registering two heads with the same name", function() {
        var t = "some dummy text";

        // Same plugin
        var hydraSame = new Hydra();
        var heads = [simpleHydraHead('/foo', t, 'name'),
                     simpleHydraHead('/bar', t, 'name')];
        expect(function() {
            hydraSame.registerPlugin({name: 'plugin1', heads: heads});
        }).toThrow("DuplicateHydraHeadNameException");

        // Different plugin
        var hydraDifferent = new Hydra();
        var headsPlugin1 = [simpleHydraHead('/foo', t, 'duplicateHead'),
                            simpleHydraHead('/bar', t, 'plugin1Head2')];
        var headsPlugin2 = [simpleHydraHead('/foo', t, 'plugin2Head'),
                            simpleHydraHead('/bar', t, 'duplicateHead')];
        hydraDifferent.registerPlugin({name: 'p1', heads: headsPlugin1});
        expect(function() {
            hydraDifferent.registerPlugin({name: 'p2', heads: headsPlugin2});
        }).toThrow("DuplicateHydraHeadNameException");
    });
});
