// @flow
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { ipcRenderer } from 'electron';
import routes from '../constants/routes';
import styles from './Home.css';

type Props = {};

export default class Home extends Component<Props> {
  props: Props;

  state = {
    updateAvailable: false,
    downloading: false
  };

  componentDidMount = () => {
    ipcRenderer.send('check-for-updates');
    ipcRenderer.on('update-available', () => {
      this.setState({
        updateAvailable: true
      });
    });
  };

  updateNow = () => {
    ipcRenderer.send('download-update');
    this.setState({
      downloading: true
    });
  };

  render() {
    return (
      <div className={styles.container} data-tid="container">
        <h2>Home</h2>
        <Link to={routes.COUNTER}>to Counter</Link>
        {this.state.updateAvailable && (
          <button onClick={this.updateNow} type="button">
            {this.state.downloading ? 'UPDATING' : 'UPDATE'}
          </button>
        )}
      </div>
    );
  }
}
