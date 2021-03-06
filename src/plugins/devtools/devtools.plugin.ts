import { NgxsPlugin } from '../../symbols';
import { getTypeFromInstance } from '../../internals';
import { Injectable, Inject } from '@angular/core';
import { NgxsDevtoolsExtension, NgxsDevtoolsOptions, NGXS_DEVTOOLS_OPTIONS, NgxsDevtoolsAction } from './symbols';
import { StateStream } from '../../state-stream';

/**
 * Adds support for the Redux Devtools extension:
 * http://extension.remotedev.io/
 */
@Injectable()
export class NgxsReduxDevtoolsPlugin implements NgxsPlugin {
  private readonly devtoolsExtension: NgxsDevtoolsExtension | null = null;
  private readonly windowObj: any = typeof window !== 'undefined' ? window : {};

  constructor(@Inject(NGXS_DEVTOOLS_OPTIONS) private _options: NgxsDevtoolsOptions, private _state: StateStream) {
    const globalDevtools = this.windowObj['__REDUX_DEVTOOLS_EXTENSION__'] || this.windowObj['devToolsExtension'];

    if (globalDevtools) {
      this.devtoolsExtension = globalDevtools.connect({
        name: 'NGXS',
        maxAge: _options.maxAge,
        actionSanitizer: _options.actionSanitizer,
        stateSanitizer: _options.stateSanitizer
      }) as NgxsDevtoolsExtension;

      this.devtoolsExtension.subscribe(a => this.dispatched(a));
    }
  }

  /**
   * Middleware handle function
   */
  handle(state: any, action: any, next: any) {
    const isDisabled = this._options && this._options.disabled;
    if (!this.devtoolsExtension || isDisabled) {
      return next(state, action);
    }

    // process the state
    const res = next(state, action);

    res.subscribe(newState => {
      // if init action, send initial state to dev tools
      const isInitAction = getTypeFromInstance(action) === '@@INIT';
      if (isInitAction) {
        this.devtoolsExtension.init(state);
      } else {
        this.devtoolsExtension.send(getTypeFromInstance(action), newState);
      }
    });

    return res;
  }

  /**
   * Handle the action from the dev tools subscription
   */
  dispatched(action: NgxsDevtoolsAction) {
    if (action.type === 'DISPATCH') {
      if (action.payload.type === 'JUMP_TO_ACTION' || action.payload.type === 'JUMP_TO_STATE') {
        const prevState = JSON.parse(action.state);
        this._state.next(prevState);
      } else if (action.payload.type === 'TOGGLE_ACTION') {
        // TODO
      }
    } else if (action.type === 'ACTION') {
      // TODO
      // const actionPayload = JSON.parse(action.payload);
      // this._store.dispatch(actionPayload);
    }
  }
}
