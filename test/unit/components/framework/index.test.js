'use strict';

const path = require('path');
const proxyquire = require('proxyquire');
const chai = require('chai');
const sinon = require('sinon');
const Context = require('../../../../src/Context');

// Configure chai
chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
const expect = require('chai').expect;

const getContext = async () => {
  const contextConfig = {
    root: process.cwd(),
    stateRoot: path.join(process.cwd(), '.serverless'),
    stage: 'dev',
    appName: 'some-random-name',
    interactiveDisabled: true,
  };
  const context = new Context(contextConfig);
  await context.init();
  return context;
};

describe('test/unit/components/framework/index.test.js', () => {
  it('correctly handles deploy', async () => {
    const spawnStub = sinon.stub().returns({
      on: (arg, cb) => {
        if (arg === 'close') cb(0);
      },
      stdout: {
        on: (arg, cb) => {
          const data = 'Stack Outputs:\nKey: Output';
          if (arg === 'data') cb(data);
        },
      },
      kill: () => {},
    });
    const FrameworkComponent = proxyquire('../../../../components/framework/serverless.js', {
      child_process: {
        spawn: spawnStub,
      },
    });

    const context = await getContext();
    const component = new FrameworkComponent('some-id', context, {});
    await component.deploy();

    expect(spawnStub).to.be.calledWithExactly('serverless', ['deploy', '--stage', 'dev'], {
      cwd: '.',
      stdio: undefined,
    });
    expect(spawnStub).to.be.calledWithExactly(
      'serverless',
      ['info', '--verbose', '--stage', 'dev'],
      {
        cwd: '.',
        stdio: undefined,
      }
    );
    expect(component.state).to.deep.equal({});
    expect(component.outputs).to.deep.equal({ Key: 'Output' });
  });

  it('correctly handles remove', async () => {
    const spawnStub = sinon.stub().returns({
      on: (arg, cb) => {
        if (arg === 'close') cb(0);
      },
      kill: () => {},
    });

    const FrameworkComponent = proxyquire('../../../../components/framework/serverless.js', {
      child_process: {
        spawn: spawnStub,
      },
    });

    const context = await getContext();
    const component = new FrameworkComponent('some-id', context, {});
    component.state = {
      key: 'val',
    };
    component.outputs = {
      outputkey: 'outputval',
    };

    await component.remove();

    expect(spawnStub).to.be.calledWithExactly('serverless', ['remove', '--stage', 'dev'], {
      cwd: '.',
      stdio: undefined,
    });
    expect(component.state).to.deep.equal({});
    expect(component.outputs).to.deep.equal({});
  });

  it('correctly handles command', async () => {
    const spawnStub = sinon.stub().returns({
      on: (arg, cb) => {
        if (arg === 'close') cb(0);
      },
      kill: () => {},
    });

    const FrameworkComponent = proxyquire('../../../../components/framework/serverless.js', {
      child_process: {
        spawn: spawnStub,
      },
    });

    const context = await getContext();
    const component = new FrameworkComponent('some-id', context, { path: 'custom-path' });

    await component.command('print', { key: 'val', flag: true });

    expect(spawnStub).to.be.calledWithExactly(
      'serverless',
      ['print', '--key=val', '--flag', '--stage', 'dev'],
      { cwd: 'custom-path', stdio: 'inherit' }
    );
  });
});