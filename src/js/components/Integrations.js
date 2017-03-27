var React = require('react');

var util = require('utils/util');
var UserStore = require('stores/UserStore');
var UserActions = require('actions/UserActions');
var AppConstants = require('constants/AppConstants');
import {Tabs, Tab, FontIcon, FlatButton, RaisedButton,
    IconMenu, MenuItem, Toggle, TextField, Snackbar, IconButton} from 'material-ui';
var api = require('utils/api');
import connectToStores from 'alt-utils/lib/connectToStores';
var toastr = require('toastr');
import {clone} from 'lodash';
import {browserHistory} from 'react-router';
import {changeHandler} from 'utils/component-utils';


@connectToStores
@changeHandler
export default class Integrations extends React.Component {
    static defaultProps = {};
    constructor(props) {
        super(props);
        let sync_services = [];
        if (props.user) sync_services = clone(props.user.sync_services)
        this.state = {
            form: {
                sync_services: sync_services
            },
            snack_message: null,
            snack_open: false
        };

    }

    static getStores() {
        return [UserStore];
    }

    static getPropsFromStores() {
        return UserStore.getState();
    }

    componentDidMount() {
        let action = this.props.location.query.action || this.props.params.action;
        if (action) {
            if (action == 'pocket_finish') {
                this.finish_pocket_authentication();
            } else if (action == 'evernote_connect') {
                this.finish_evernote_authentication();
            }
        }
    }

    // Pocket

    start_pocket_authentication() {
        this.setState({snack_message: "Pocket connecting...", snack_open: true})
        api.post("/api/integrations/pocket/authenticate", {}, (res) => {
            if (res.redirect) window.location = res.redirect;
        });
    }

    finish_pocket_authentication() {
        this.setState({snack_message: "Signing in to Pocket...", snack_open: true})
        api.post("/api/integrations/pocket/authorize", {}, (res) => {
            if (res.user) {
                UserActions.storeUser(res.user);
                this.setState({snack_message: "Pocket connected!", snack_open: true})
                browserHistory.push('/app/integrations');
            }
        });
    }

    disconnect_pocket() {
        this.setState({snack_message: "Disconnecting from Pocket...", snack_open: true})
        api.post("/api/integrations/pocket/disconnect", {}, (res) => {
            if (res.user) {
                UserActions.storeUser(res.user);
            }
        });
    }

    // Evernote

    start_evernote_authentication() {
        this.setState({snack_message: "Evernote connecting...", snack_open: true})
        api.post("/api/integrations/evernote/authenticate", {}, (res) => {
            if (res.redirect) window.location = res.redirect;
        });
    }

    finish_evernote_authentication() {
        this.setState({snack_message: "Signing in to Evernote...", snack_open: true})
        let params = this.props.location.query;
        api.post("/api/integrations/evernote/authorize", params, (res) => {
            if (res.user) {
                UserActions.storeUser(res.user);
                this.setState({snack_message: "Evernote connected!", snack_open: true})
                browserHistory.push('/app/integrations');
            }
        });
    }

    disconnect_evernote() {
        this.setState({snack_message: "Disconnecting from Evernote...", snack_open: true})
        api.post("/api/integrations/evernote/disconnect", {}, (res) => {
            if (res.user) {
                UserActions.storeUser(res.user);
            }
        });
    }

    update_user() {
        let {form} = this.state;
        let params = {
            sync_services: form.sync_services.join(',')
        };
        UserActions.update(params);
    }

    save_integration_props(props, opts) {
        let {form} = this.state;
        let params = {};
        let stringify_json = opts && opts.stringify_json;
        props.forEach((prop) => {
            let val = form[prop];
            if (stringify_json && (Array.isArray(val) || val instanceof Object)) {
                val = JSON.stringify(val);
            }
            params[prop] = val;
        })
        params.props = props.join(',');
        api.post("/api/integrations/update_integration_settings", params, (res) => {
            if (res.user) {
                UserActions.storeUser(res.user);
            }
            this.setState({form: {}})
        });
    }

    authenticate_google_service(service_name) {
        api.get(`/api/auth/google/${service_name}/authenticate`, {}, (res) => {
            if (res.uri) window.location = res.uri;
        });
    }

    google_disconnect() {
        var auth2 = gapi.auth2.getAuthInstance();
        auth2.disconnect();
        toastr.success("Disconnected Google authorization.")
    }

    handleSnackClose() {
        this.setState({snack_open: false});
    }

    service_sync_toggle(int_val)  {
        let {form} = this.state;
        form.sync_services = util.toggleInList(form.sync_services, int_val);
        this.setState({form});
    }

    sync_enabled(int_val) {
        let {user} = this.props;
        let sync_services = user.sync_services || [];
        return sync_services.indexOf(int_val) > -1;
    }

    tab_style(int_val) {
        let st = {};
        if (this.sync_enabled(int_val)) {
            st.backgroundColor = '#41CAFB';
        } else {
            st.backgroundColor = '#22647C';
        }
        return st;
    }

    render_toggles() {
        let {form} = this.state;
        return AppConstants.INTEGRATIONS.map((int) => {
            return ( <Toggle
                key={int.value}
                name={int.value}
                toggled={form.sync_services.indexOf(int.value) > -1}
                labelPosition="right"
                label={int.label}
                onToggle={this.service_sync_toggle.bind(this, int.value)} />
            );
        })
    }

    render() {
        let {form} = this.state;
        let {user} = this.props;
        if (!user) return <div></div>;
        let gr_user_id, gh_user, gh_pat, en_notebook_ids, evernote_connected;
        let ints = {};
        let gfit_activities = [];
        if (user && user.integrations) {
            ints = user.integrations;
            gr_user_id = ints.goodreads_user_id;
            gh_user = ints.github_username;
            gh_pat = ints.github_pat;
            en_notebook_ids = ints.evernote_notebook_ids;
            evernote_connected = ints.evernote_access_token != null;
            if (ints.gfit_activities) gfit_activities = ints.gfit_activities.split(',');
        }
        let pocket_connected = user.integrations && user.integrations.pocket_access_token != null;
        return (
            <div>

                <div className="pull-right">
                    <IconMenu className="pull-right" iconButtonElement={<IconButton iconClassName="material-icons">more_vert</IconButton>}>
                      <MenuItem key="gr" primaryText="Revoke all Google Scopes" onClick={this.google_disconnect.bind(this)} />
                    </IconMenu>
                </div>

                <h1>Integrations</h1>

                <div className="vpad">
                    <p className="lead">Sync enabled on <b>{ user.sync_services.length }</b> service(s).</p>

                    <p>
                        Enable toggles below to enable daily synchronization from the specified services.
                        Note that you may need to add additional information or credentials to enable
                        sync with some services.
                    </p>

                    { this.render_toggles() }
                    <RaisedButton primary={true} label="Save Sync Settings" onClick={this.update_user.bind(this)} />
                </div>

                <Tabs>
                    <Tab label="Pocket" style={this.tab_style('pocket')}>

                        <p className="lead">Your reading list will be synced daily from Pocket.</p>

                        <FlatButton label={ pocket_connected ? "Connected" : "Connect" } onClick={this.start_pocket_authentication.bind(this)} disabled={pocket_connected}/>
                        <div hidden={!pocket_connected}>
                            <FlatButton label="Disconnect" onClick={this.disconnect_pocket.bind(this)} />
                        </div>
                    </Tab>

                    <Tab label="Evernote" style={this.tab_style('evernote')}>

                        <p className="lead">Flow will receive new notes/quotes/excerpts added to specified notebooks on Evernote.</p>

                        <FlatButton label={ evernote_connected ? "Connected" : "Connect" } onClick={this.start_evernote_authentication.bind(this)} disabled={evernote_connected}/>
                        <div hidden={!evernote_connected}>
                            <FlatButton label="Disconnect" onClick={this.disconnect_evernote.bind(this)} /><br/>

                            <b>Evernote User ID:</b> <span>{ user.evernote_id || "--" }</span><br/>
                            <b>Capture Notebook IDs:</b> <span>{ en_notebook_ids || "--" }</span><br/>
                            <TextField name="user_id" placeholder="Evernote Notebook IDs (comma separated)" value={form.evernote_notebook_ids} onChange={this.changeHandler.bind(this, 'form', 'evernote_notebook_ids')} fullWidth /><br/>

                            <RaisedButton label="Save" onClick={this.save_integration_props.bind(this, ['evernote_notebook_ids'])} />

                        </div>
                    </Tab>

                    <Tab label="Goodreads" style={this.tab_style('goodreads')}>

                        <p className="lead">Your currently reading shelf list will be synced daily from Goodreads.</p>

                        <b>Current User ID:</b> <span>{ gr_user_id || "--" }</span><br/>
                        <TextField name="user_id" placeholder="Goodreads User ID" value={form.goodreads_user_id} onChange={this.changeHandler.bind(this, 'form', 'goodreads_user_id')} /><br/>

                        <RaisedButton label="Save" onClick={this.save_integration_props.bind(this, ['goodreads_user_id'])} />
                    </Tab>

                    <Tab label="Github" style={this.tab_style('github')}>

                        <p className="lead">Public commit counts from your profile will be synced daily.</p>

                        <b>Current Github Username:</b> <span>{ gh_user || "--" }</span><br/>
                        <b>Current Github PAT:</b> <span>{ gh_pat || "--" }</span><br/>
                        <TextField name="gh_username" placeholder="Github User ID" value={form.github_username||''} onChange={this.changeHandler.bind(this, 'form', 'github_username')} /><br/>
                        <TextField name="gh_pat" placeholder="Github Personal Access Token (PAT)" value={form.github_pat||''} onChange={this.changeHandler.bind(this, 'form', 'github_pat')} /><br/>

                        <RaisedButton label="Save" onClick={this.save_integration_props.bind(this, ['github_username', 'github_pat'])} />
                    </Tab>

                    <Tab label="Google Fit" style={this.tab_style('gfit')}>
                        <FlatButton label="Authenticate with Fit" onClick={this.authenticate_google_service.bind(this, 'fit')} />

                        <h4>Configure Activity Capture</h4>

                        <p className="lead">Flow can capture one ore more activities pulled from Google Fit.
                            Enter a comma separated list of keywords (to match against Fit activity name and description).
                            This keyword will also be used as the tracking variable name.
                            For each variable, the day's total activity duration (in seconds) will be stored.</p>

                        <b>Current Activity Keywords:</b> <ul>{ gfit_activities.map((act) => {
                            return <li>{ act }</li>
                        }) }</ul><br/>
                        <TextField name="gfit_activities" placeholder="Fit Activity Keywords (comma separated)" value={form.gfit_activities||''} onChange={this.changeHandler.bind(this, 'form', 'gfit_activities')} fullWidth /><br/>

                        <RaisedButton label="Save" onClick={this.save_integration_props.bind(this, ['gfit_activities'])} />

                    </Tab>


                </Tabs>

                <Snackbar message={this.state.snack_message || ""}
                    open={this.state.snack_open}
                    onRequestClose={this.handleSnackClose.bind(this)}
                    autoHideDuration={4000} />
            </div>
        );
    }
};

module.exports = Integrations;
