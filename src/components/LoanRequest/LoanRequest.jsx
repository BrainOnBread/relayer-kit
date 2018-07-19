import Dharma from "@dharmaprotocol/dharma.js";
import React, { Component } from "react";
import * as moment from "moment";

import Api from "../../services/api";
import FillButton from "../FillButton/FillButton";

import { Link } from "react-router-dom";

import { Button } from "react-bootstrap";

class LoanRequest extends Component {
    constructor(props) {
        super(props);

        this.state = {
            loanRequest: null,
            hasSufficientAllowance: null,
        };

        this.handleFill = this.handleFill.bind(this);
        this.handleAuthorize = this.handleAuthorize.bind(this);
        this.setHasSufficientAllowance = this.setHasSufficientAllowance.bind(this);
    }

    componentDidMount() {
        const { LoanRequest } = Dharma.Types;

        const { dharma, id } = this.props;

        const api = new Api();

        api.get(`loanRequests/${id}`).then(async (loanRequestData) => {
            const loanRequest = await LoanRequest.load(dharma, loanRequestData);

            this.setState({ loanRequest });

            this.setHasSufficientAllowance();
        });
    }

    isExpired(unixTimestamp) {
        return moment.unix(unixTimestamp).isBefore();
    }

    async handleFill() {
        await this.state.loanRequest.fill();
    }

    async handleAuthorize() {
        const { loanRequest } = this.state;

        const txHash = await loanRequest.allowPrincipalTransfer();

        console.log(txHash);
    }

    async setHasSufficientAllowance() {
        const { dharma } = this.props;
        const { loanRequest } = this.state;

        const { Tokens } = Dharma.Types;

        const accounts = await dharma.blockchain.getAccounts();
        const currentAccount = accounts[0];

        const tokens = new Tokens(dharma, currentAccount);
        const terms = loanRequest.getTerms();

        const tokenData = await tokens.getTokenDataForSymbol(terms.principalTokenSymbol);

        const hasSufficientAllowance =
            tokenData.hasUnlimitedAllowance || tokenData.allowance >= terms.principalAmount;

        this.setState({
            hasSufficientAllowance,
        });
    }

    render() {
        const { loanRequest, hasSufficientAllowance } = this.state;

        if (!loanRequest || !hasSufficientAllowance) {
            // TODO(kayvon): show loading state here
            return null;
        }

        const terms = loanRequest.getTerms();

        return (
            <div>
                <div>
                    <Link to="/">Back</Link>
                </div>

                <dl className="row">
                    <dt className="col-sm-3">Principal</dt>
                    <dd className="col-sm-9">
                        {`${terms.principalAmount} ${terms.principalTokenSymbol}`}
                    </dd>

                    <dt className="col-sm-3">Collateral</dt>
                    <dd className="col-sm-9">
                        {`${terms.collateralAmount} ${terms.collateralTokenSymbol}`}
                    </dd>

                    <dt className="col-sm-3">Interest Rate</dt>
                    <dd className="col-sm-9">{terms.interestRate}%</dd>

                    <dt className="col-sm-3">Term Duration</dt>
                    <dd className="col-sm-9">{`${terms.termDuration} ${terms.termUnit}`}</dd>

                    <dt className="col-sm-3">Loan Requester</dt>
                    <dd className="col-sm-9">
                        <a
                            href={`https://etherscan.io/address/${terms.debtorAddress}`}
                            target="_blank">
                            {terms.debtorAddress}
                        </a>
                    </dd>

                    <dt className="col-sm-3">Valid Until</dt>
                    <dd className="col-sm-9">{moment.unix(terms.expiresAt).calendar()}</dd>
                </dl>

                {hasSufficientAllowance || (
                    <div>
                        <Button onClick={this.handleAuthorize} bsStyle="primary">
                            Authorize
                        </Button>
                    </div>
                )}

                <FillButton
                    disabled={this.isExpired(loanRequest.expiresAt)}
                    handleFill={this.handleFill}
                />
            </div>
        );
    }
}

export default LoanRequest;
