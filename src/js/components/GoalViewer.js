var React = require('react');
import { Dialog, RaisedButton, FlatButton, TextField,
  IconButton, Slider } from 'material-ui';
var api = require('utils/api');
var util = require('utils/util');
import {clone} from 'lodash';
var Styles = require('constants/Styles');
var ProgressLine = require('components/common/ProgressLine');
import {changeHandler} from 'utils/component-utils';

@changeHandler
export default class GoalViewer extends React.Component {
  static defaultProps = {

  }
  constructor(props) {
      super(props);
      this.state = {
          annual: null,
          monthly: null,
          longterm: null,
          set_goal_form: null,  // Which goal to show form for (date str or 'longterm')
          form: {},
          assessment_form: {assessment: 1}
      };
      this.ASSESS_LABELS = ["Very Poorly", "Poorly", "OK", "Well", "Very Well"];
      this.ASSESSMENT_DAY = 26;
      this.GOAL_M_FORMAT = "YYYY-MM";
      this.GOAL_M_LABEL_FORMAT = "MMM YYYY";
  }

  componentDidMount() {
    this.fetch_current();
  }

  update_goal(params) {
    api.post("/api/goal", params, (res) => {
      let g = res.goal;
      let st = {};
      if (g.annual) st.annual = g;
      else if (g.monthly) st.monthly = g;
      else if (g.longterm) st.longterm = g;
      st.set_goal_form = null;
      this.setState(st);
    })
  }

  save_goals() {
    let params = clone(this.state.form);
    params.id = this.state.set_goal_form;
    this.update_goal(params);
  }

  save_assessment(g) {
    let {assessment_form} = this.state;
    let params = {
      id: g.id,
      assessment: assessment_form.assessment
    }
    this.update_goal(params);
  }

  dismiss() {
    this.setState({set_goal_form: null, set_goal_label: null});
  }

  in_assessment_window() {
    let today = new Date();
    return today.getDate() >= this.ASSESSMENT_DAY;
  }

  fetch_current() {
    api.get("/api/goal/current", {}, (res) => {
      let st = {annual: res.annual, monthly: res.monthly, longterm: res.longterm};
      this.setState(st);
    });
  }

  show_longterm() {
    if (this.state.longterm) this.show_goal_dialog(this.state.longterm, 'longterm');
    else this.setState({set_goal_form: 'longterm', set_goal_label: 'long term', form: {}});
  }

  show_goal_dialog(g, type) {
      let today = new Date();
      let form = {};
      if (g) {
        form = util.spread_array(g, 'text', 'text', 4);
      }
      let id, label;
      if (type == 'annual') id = today.getFullYear();
      else if (type == 'monthly') {
        let time = today.getTime();
        id = util.printDate(time, this.GOAL_M_FORMAT);
        label = util.printDate(time, this.GOAL_M_LABEL_FORMAT);
      }
      else if (type == 'longterm') id = 'longterm';
      let st = {
        form: form,
        set_goal_form: id,
        set_goal_label: label == null ? id : label
      };
      this.setState(st);
  }

  render_set_goal_form() {
    let {set_goal_form, form} = this.state;
    if (set_goal_form) {
      let _inputs = [1,2,3,4].map((idx) => {
        let key = 'text' + (idx);
        return <TextField key={key} name={key}
                          placeholder={`Goal ${idx}`} value={form[key] || ''}
                          onChange={this.changeHandler.bind(this, 'form', key)}
                          fullWidth autoFocus={idx == 1} />
      });
      return (
        <div>
          { _inputs }
        </div>
      )
    } else return null;
  }

  render_goal(g, type) {
    let {assessment_form} = this.state;
    let goal_list, create_prompt;
    let today = new Date();
    let date_printed = "";
    let date = new Date();
    let value = 0;
    let total = 100;
    if (type == 'annual') {
      date_printed = date.getFullYear();
      value = util.dayOfYear(today);
      total = 365;
    } else {
      date_printed = util.printDate(date.getTime(), "MMMM YYYY");
      value = today.getDate();
      total = util.daysInMonth(date.getMonth()+1, date.getFullYear());
    }
    let show_assessment = g && this.in_assessment_window() && !g.annual && !g.assessment;
    let assess_label = this.ASSESS_LABELS[(assessment_form.assessment-1)];
    if (g) {
      goal_list = (
        <ul className="goalList">
          { g.text.map((txt, j) => {
            return <li key={j}>{txt}</li>
          }) }
        </ul>
      );
    } else {
      create_prompt = (
        <div className="empty"><a href="javascript:void(0)" onClick={this.show_goal_dialog.bind(this, g, type)}>Set goals</a> for { date_printed }</div>
        );
    }
    return (
      <div className="goal col-sm-6" key={type}>
        <a href="javascript:void(0)" className="goalDate" onClick={this.show_goal_dialog.bind(this, g, type)}>{ date_printed }</a>
        <ProgressLine value={value} total={total} />

        { goal_list }
        { create_prompt }

        <div hidden={!show_assessment}>
          <p className="lead">The month is almost over - how&apos;d you do?</p>

          <Slider name='assessment' value={assessment_form.assessment} onChange={this.changeHandlerSlider.bind(this, 'assessment_form', 'assessment')} max={5} min={1} defaultValue={1} step={1} />
          <RaisedButton label={`Submit Assessment (${assess_label})`} onClick={this.save_assessment.bind(this, g)} primary={true} />
        </div>
      </div>
    );
  }

  render() {
    let {annual, monthly, set_goal_form, set_goal_label} = this.state;
    let goal_label;
    if (set_goal_label) goal_label = set_goal_label;
    let _goals = (
      <div className="row">
        { this.render_goal(monthly, 'monthly') }
        { this.render_goal(annual, 'annual') }
      </div>
    )
    let actions = [
      <RaisedButton label="Save Goals" onClick={this.save_goals.bind(this)} primary={true} />,
      <FlatButton label="Later" onClick={this.dismiss.bind(this)} />
    ]
    return (
      <div className="GoalsViewer">
        <div className="row">
          <div className="col-sm-6">
            <h3>Goals</h3>
          </div>
          <div className="col-sm-6">
            <span className="pull-right"><IconButton tooltip="Longterm Goals" iconClassName="material-icons" onClick={this.show_longterm.bind(this)}>call_made</IconButton></span>
          </div>
        </div>

        { _goals }

        <Dialog open={set_goal_form != null}
                title={`Set ${goal_label} goals`}
                actions={actions}
                onRequestClose={this.dismiss.bind(this)}
                {...Styles.Dialog} >
          { this.render_set_goal_form() }
        </Dialog>
      </div>
    )
  }
}
